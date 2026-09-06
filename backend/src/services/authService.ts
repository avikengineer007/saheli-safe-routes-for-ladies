import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { PersistenceService, StoredUser } from './persistenceService';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    phone: string;
    name: string;
    trustScore: number;
    accountAgeDays: number;
  };
}

export class AuthService {
  private static getJwtSecret(): string {
    return process.env.JWT_SECRET || 'saheli_dev_hmac_secret_key_change_in_production_2026';
  }

  /**
   * Generates a tamper-proof session token for a verified user
   */
  public static generateSessionToken(user: StoredUser): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(
      JSON.stringify({
        sub: user.id,
        phone: user.phone,
        name: user.name,
        iat: now,
        exp: now + 30 * 24 * 3600 // 30-day session
      })
    ).toString('base64url');

    const signature = crypto
      .createHmac('sha256', this.getJwtSecret())
      .update(`${header}.${payload}`)
      .digest('base64url');

    return `${header}.${payload}.${signature}`;
  }

  /**
   * Validates session token signature and returns user payload
   */
  public static verifySessionToken(token: string): { valid: boolean; userId?: string; error?: string } {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'Malformed token' };
      }

      const [header, payload, signature] = parts;
      const expectedSig = crypto
        .createHmac('sha256', this.getJwtSecret())
        .update(`${header}.${payload}`)
        .digest('base64url');

      if (signature !== expectedSig) {
        return { valid: false, error: 'Invalid token signature' };
      }

      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return { valid: false, error: 'Session token has expired' };
      }

      return { valid: true, userId: decoded.sub };
    } catch (err: any) {
      return { valid: false, error: 'Token verification failed' };
    }
  }

  /**
   * Dispatches a 6-digit OTP code to an Indian mobile number
   * - Enforces rate limit: max 3 sends per hour per phone
   * - Hard-gates mock OTP '123456' to non-production only
   */
  public static async sendOtp(phone: string): Promise<{ success: boolean; message: string; remainingHourlySends?: number }> {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const normalizedPhone = cleanPhone.startsWith('+91') ? cleanPhone : `+91${cleanPhone.slice(-10)}`;

    if (!/^\+91[6-9]\d{9}$/.test(normalizedPhone)) {
      throw new Error('Please provide a valid 10-digit Indian mobile number.');
    }

    const persistence = PersistenceService.getInstance();

    // 1. Enforce Per-Phone Rate Limit (Max 3 sends per hour)
    const rateCheck = persistence.checkAndRecordOtpSendRate(normalizedPhone);
    if (!rateCheck.allowed) {
      throw new Error('Rate limit exceeded: Maximum 3 OTP requests allowed per hour for this phone number.');
    }

    // 2. Generate cryptographically secure 6-digit OTP
    const isProduction = process.env.NODE_ENV === 'production';
    const allowMock = !isProduction && (process.env.ALLOW_MOCK_OTP === 'true' || !process.env.FAST2SMS_API_KEY);

    let otp: string;
    if (allowMock && normalizedPhone.endsWith('9876543210')) {
      // Deterministic dev test code for test suite
      otp = '123456';
    } else {
      otp = crypto.randomInt(100000, 999999).toString();
    }

    // Store in persistence with 5-minute TTL
    persistence.saveOtp(normalizedPhone, otp, 300);

    // 3. Dispatch via Fast2SMS if API key is present
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    if (fast2smsKey && !allowMock) {
      try {
        const rawTenDigit = normalizedPhone.slice(-10);
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            'authorization': fast2smsKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            route: 'otp',
            variables_values: otp,
            numbers: rawTenDigit
          })
        });

        const resData = (await response.json()) as any;
        if (!resData.return) {
          console.warn('[Fast2SMS Warning]:', resData);
        }
      } catch (err: any) {
        console.error('[Fast2SMS Dispatch Error]:', err.message);
      }
    } else {
      console.log(`[SAHELI Dev OTP]: Code for ${normalizedPhone} is ${otp}`);
    }

    return {
      success: true,
      message: `Verification code sent to ${normalizedPhone.slice(0, 6)}****${normalizedPhone.slice(-2)}`,
      remainingHourlySends: rateCheck.remaining
    };
  }

  /**
   * Verifies the 6-digit OTP code and creates/retrieves user account
   */
  public static async verifyOtpAndLogin(
    phone: string,
    otp: string,
    name?: string
  ): Promise<{ token: string; user: StoredUser }> {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const normalizedPhone = cleanPhone.startsWith('+91') ? cleanPhone : `+91${cleanPhone.slice(-10)}`;

    const persistence = PersistenceService.getInstance();
    const result = persistence.verifyOtp(normalizedPhone, otp);

    if (!result.valid) {
      throw new Error(result.reason || 'Invalid or expired OTP code.');
    }

    // Retrieve or create verified phone account
    const user = persistence.findOrCreateUserByPhone(normalizedPhone, name || 'SAHELI Sister');
    const token = this.generateSessionToken(user);

    return { token, user };
  }

  /**
   * Express Middleware requiring authenticated Bearer session token
   */
  public static requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required. Please verify your phone number to submit reports.'
      });
      return;
    }

    const token = authHeader.substring(7);
    const verifyResult = AuthService.verifySessionToken(token);

    if (!verifyResult.valid || !verifyResult.userId) {
      res.status(401).json({
        error: `Authentication failed: ${verifyResult.error || 'Invalid session'}`
      });
      return;
    }

    const user = PersistenceService.getInstance().getUser(verifyResult.userId);
    if (!user) {
      res.status(401).json({ error: 'User account not found.' });
      return;
    }

    const accountCreated = new Date(user.createdAt).getTime();
    const accountAgeDays = Math.max(0, Math.floor((Date.now() - accountCreated) / (24 * 3600 * 1000)));

    req.user = {
      id: user.id,
      phone: user.phone,
      name: user.name,
      trustScore: user.trustScore,
      accountAgeDays
    };

    next();
  }
}
