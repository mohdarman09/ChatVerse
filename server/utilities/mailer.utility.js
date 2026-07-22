import nodemailer from 'nodemailer';

let transporter = null;

const initializeTransporter = () => {
    const { GMAIL_USER, GMAIL_PASS } = process.env;

    if (!GMAIL_USER || !GMAIL_PASS) {
        console.error('❌ Gmail credentials not configured. Set GMAIL_USER and GMAIL_PASS in .env');
        console.error('   For Gmail App Password: https://myaccount.google.com/apppasswords');
        throw new Error('Email service not configured. Set GMAIL_USER and GMAIL_PASS in .env');
    }

    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: GMAIL_USER,
            pass: GMAIL_PASS,
        },
    });
};

const getTransporter = () => {
    if (!transporter) {
        initializeTransporter();
    }
    return transporter;
};

export const sendOTPEmail = async (email, otp, purpose = 'verification') => {
    const t = getTransporter();

    const subject = purpose === 'verification'
        ? 'Verify your ChatVerse email'
        : 'Reset your ChatVerse password';

    const message = purpose === 'verification'
        ? `Your email verification OTP is: <b>${otp}</b>. It expires in 10 minutes.`
        : `Your password reset OTP is: <b>${otp}</b>. It expires in 10 minutes.`;

    const info = await t.sendMail({
        from: `"ChatVerse Team" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "🔐 Verify Your ChatVerse Account",
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
              Verify Your Email
            </h2>

            <p style="color:#555; line-height:1.7;">
              Hi,
              <br><br>
              Thank you for creating your ChatVerse account.
              Please use the verification code below to complete your registration.
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

    return true;
};
