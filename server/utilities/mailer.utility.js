import { Resend } from 'resend';

let resendClient = null;

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('[MAIL] RESEND_API_KEY is not configured');
    console.error('   Create a key at: https://resend.com/api-keys');
    throw new Error('Email service not configured. Set RESEND_API_KEY in .env / Railway variables.');
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
    console.log('[MAIL] transporter configuration: provider=resend (HTTP API), no credentials logged');
  }

  return resendClient;
};

const getFromAddress = () =>
  process.env.RESEND_FROM_EMAIL || 'ChatVerse Team <onboarding@resend.dev>';

export const sendOTPEmail = async (email, otp, purpose = 'verification') => {
  const client = getResendClient();

  const isVerify = purpose === 'verification';

  console.log('[MAIL] attempting to send OTP email via resend', { to: email, purpose });

  const { data, error } = await client.emails.send({
    from: getFromAddress(),
    to: email,
    subject: isVerify ? 'Verify your ChatVerse email' : 'Reset your ChatVerse password',
    html: `
    <div style="font-family: Arial, sans-serif; background:#f4f4f4; padding:40px;">
      <table style="max-width:600px; margin:auto; background:#ffffff; border-radius:12px; overflow:hidden;">
        
        <tr>
          <td style="background:#6C63FF; padding:24px; text-align:center;">
            <h1 style="color:#ffffff; margin:0;">💬 ChatVerse</h1>
          </td>
        </tr>

        <tr>
          <td style="padding:32px;">
            <h2 style="margin-top:0; color:#333;">
              ${isVerify ? 'Verify Your Email' : 'Reset Your Password'}
            </h2>

            <p style="color:#555; line-height:1.7;">
              Hi,
              <br><br>
              ${isVerify
                ? 'Thank you for creating your ChatVerse account. Please use the verification code below to complete your registration.'
                : 'We received a request to reset your ChatVerse password. Use the code below to proceed.'}
            </p>

            <div style="text-align:center; margin:30px 0;">
              <div style="
                display:inline-block;
                background:#6C63FF;
                color:white;
                padding:16px 32px;
                font-size:32px;
                letter-spacing:8px;
                font-weight:bold;
                border-radius:10px;
              ">
                ${otp}
              </div>
            </div>

            <p style="color:#666;">
              ⏳ This OTP is valid for
              <strong>10 minutes</strong>.
            </p>

            <p style="color:#666;">
              If you did not create a ChatVerse account,
              you can safely ignore this email.
            </p>
          </td>
        </tr>

        <tr>
          <td style="
            background:#f7f7f7;
            padding:20px;
            text-align:center;
            color:#777;
            font-size:13px;
          ">
            © ${new Date().getFullYear()} ChatVerse
            <br>
            Secure • Fast • Real-time Messaging
          </td>
        </tr>

      </table>
    </div>
  `
  });

  if (error) {
    console.error('[MAIL] send failed');
    console.error('   error.message:', error.message);
    console.error('   error.name:', error.name);
    const err = new Error(error.message || 'Failed to send OTP email');
    err.code = error.name;
    throw err;
  }

  console.log('[MAIL] send success', { id: data?.id });
  return true;
};