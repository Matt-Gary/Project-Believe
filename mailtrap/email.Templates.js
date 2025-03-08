const WELCOME_TEMPLATE = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Nossa Família</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: white; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #00B4D8, #0194B2); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Bem-vindo ao Nossa Família!</h1>
  </div>
  <div style="background: linear-gradient(to right, #3C3C3C, #000000); padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Olá {name},</p>
    <p>Estamos muito felizes em tê-lo conosco! Obrigado por se juntar à nossa comunidade.</p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="background-color: #00B4D8; color: white; width: 50px; height: 50px; line-height: 50px; border-radius: 50%; display: inline-block; font-size: 30px;">
        ✓
      </div>
    </div>
    <p>Atenciosamente,<br>Equipe Believe Calistenia</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>Esta é uma mensagem automática, por favor, não responda a este e-mail.</p>
  </div>
</body>
</html>
`;

const VERIFICATION_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #00B4D8, #0194B2); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Verify Your Email</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello,</p>
    <p>Thank you for signing up! Your verification code is:</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #00B4D8;">{verificationCode}</span>
    </div>
    <p>Enter this code on the verification page to complete your registration.</p>
    <p>This code will expire in 15 minutes for security reasons.</p>
    <p>If you didn't create an account with us, please ignore this email.</p>
    <p>Best regards,<br>Your App Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>
`;


const PASSWORD_RESET_SUCCESS_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinição de senha realizada com sucesso</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: white; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #00B4D8, #0194B2); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Redefinição de senha realizada com sucesso</h1>
  </div>
  <div style="background: linear-gradient(to right, #3C3C3C, #000000); padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Oi {name},</p>
    <p>Estamos escrevendo para confirmar que sua senha foi redefinida com sucesso.</p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="background-color: #00B4D8; color: white; width: 50px; height: 50px; line-height: 50px; border-radius: 50%; display: inline-block; font-size: 30px;">
        ✓
      </div>
    </div>
    <p>Se você não iniciou essa redefinição de senha, entre em contato com nossa equipe de suporte imediatamente.</p>
    <p>Por razões de segurança, recomendamos que você:</p>
    <ul>
      <li>Use uma senha forte e única</li>
      <li>Evite usar a mesma senha em vários sites</li>
    </ul>
    <p>Obrigado por nos ajudar a manter sua conta segura.</p>
    <p>Atenciosamente,<br>Equipe Believe</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>Esta é uma mensagem automática, por favor não responda a este e-mail.</p>
  </div>
</body>
</html>
`;

const PASSWORD_RESET_REQUEST_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: white; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #00B4D8, #0194B2); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Password Reset</h1>
  </div>
  <div style="background: linear-gradient(to right, #3C3C3C, #000000); padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Oi {name},</p>
    <p>Recebemos uma solicitação para redefinir sua senha. Se você não fez essa solicitação, ignore este e-mail.</p>
    <p>Para redefinir sua senha, clique no botão abaixo:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{resetURL}" style="background-color: #0194B2; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Redefinir senha</a>
    </div>
    <p>Este link irá expirar em 1 hora por motivos de segurança.</p>
    <p>Atenciosamente,<br>Equipe Believe</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>Esta é uma mensagem automática, por favor não responda a este e-mail.</p>
  </div>
</body>
</html>
`;
const VERIFICATION_CODE_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Verificação para Reivindicação de Benefício</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: white; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #00B4D8, #0194B2); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Código de Verificação para Reivindicação de Benefício</h1>
  </div>
  <div style="background: linear-gradient(to right, #3C3C3C, #000000); padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Olá {userName},</p>
    <p>Você está recebendo este e-mail porque uma reivindicação de benefício foi iniciada em parceria com {companyName}.</p>
    <p>Seu código de verificação é:</p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="background-color: #00B4D8; color: white; padding: 10px 20px; border-radius: 5px; display: inline-block; font-size: 24px; font-weight: bold;">
        {verificationCode}
      </div>
    </div>
    <p>Por favor, use este código para confirmar sua reivindicação de benefício.</p>
    <p>Se você não iniciou esta reivindicação, por favor ignore este e-mail ou entre em contato com nossa equipe de suporte imediatamente.</p>
    <p>Este código é válido por um período limitado de tempo.</p>
    <p>Atenciosamente,<br>Equipe Believe</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>Esta é uma mensagem automática, por favor não responda a este e-mail.</p>
  </div>
</body>
</html>
`
module.exports = {VERIFICATION_EMAIL_TEMPLATE, PASSWORD_RESET_REQUEST_TEMPLATE, PASSWORD_RESET_SUCCESS_TEMPLATE, VERIFICATION_CODE_TEMPLATE, WELCOME_TEMPLATE }