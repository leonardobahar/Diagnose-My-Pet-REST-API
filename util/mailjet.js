export const sendResetPasswordMail = (username, email) =>{
    /**
     *
     * Run:
     *
     */
    const html = `<!DOCTYPE html>
    <html>
    
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    
        <title>Pet Fest Indonesia | Confirm your mail</title>
    
        <style>
    
            body {margin:0; padding:0; -webkit-text-size-adjust:none; -ms-text-size-adjust:none;} img{line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode: bicubic;} a img{border: none;} #backgroundTable {margin:0; padding:0; width:100% !important; } a, a:link{color:#2A5DB0; text-decoration: underline;} table td {border-collapse:collapse;} span {color: inherit; border-bottom: none;} span:hover { background-color: transparent; }
    
        </style>
    
        <style>
            .scalable-image img{max-width:100% !important;height:auto !important}.button a{transition:background-color .25s, border-color .25s}.button a:hover{background-color:#e1e1e1 !important;border-color:#0976a5 !important}@media only screen and (max-width: 400px){.preheader{font-size:12px !important;text-align:center !important}.header--white{text-align:center}.header--white .header__logo{display:block;margin:0 auto;width:118px !important;height:auto !important}.header--left .header__logo{display:block;width:118px !important;height:auto !important}}@media screen and (-webkit-device-pixel-ratio), screen and (-moz-device-pixel-ratio){.sub-story__image,.sub-story__content{display:block
            !important}.sub-story__image{float:left !important;width:200px}.sub-story__content{margin-top:30px !important;margin-left:200px !important}}@media only screen and (max-width: 550px){.sub-story__inner{padding-left:30px !important}.sub-story__image,.sub-story__content{margin:0 auto !important;float:none !important;text-align:center}.sub-story .button{padding-left:0 !important}}@media only screen and (max-width: 400px){.featured-story--top table,.featured-story--top td{text-align:left}.featured-story--top__heading td,.sub-story__heading td{font-size:18px !important}.featured-story--bottom:nth-child(2) .featured-story--bottom__inner{padding-top:10px
            !important}.featured-story--bottom__inner{padding-top:20px !important}.featured-story--bottom__heading td{font-size:28px !important;line-height:32px !important}.featured-story__copy td,.sub-story__copy td{font-size:14px !important;line-height:20px !important}.sub-story table,.sub-story td{text-align:center}.sub-story__hero img{width:100px !important;margin:0 auto}}@media only screen and (max-width: 400px){.footer td{font-size:12px !important;line-height:16px !important}}
            @media screen and (max-width:600px) {
                table[class="columns"] {
                    margin: 0 auto !important;float:none !important;padding:10px 0 !important;
                }
                td[class="left"] {
                    padding: 0px 0 !important;
        </style>
    
    </head>
    
    <body style="background: #e1e1e1;font-family:Arial, Helvetica, sans-serif; font-size:1em;"><style type="text/css">
        div.preheader
        { display: none !important; }
    </style>
    <div class="preheader" style="font-size: 1px; display: none !important;">Confirm your email so we can proceed with your registration.</div>
    <table id="backgroundTable" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#e1e1e1;">
        <tr>
            <td class="body" align="center" valign="top" style="background:#e1e1e1;" width="100%">
                <table cellpadding="0" cellspacing="0">
                    <tr>
                        <td width="640">
                        </td>
                    </tr>
                    <tr>
                        <td class="main" width="640" align="center" style="padding: 0 10px;">
                            <table style="min-width: 100%; " class="stylingblock-content-wrapper" width="100%" cellspacing="0" cellpadding="0"><tr><td class="stylingblock-content-wrapper camarker-inner"><table cellspacing="0" cellpadding="0">
                                <tr>
                                    <td width="640" align="left">
                                        <table width="100%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td class="header header--left" style="padding: 20px 10px;" align="left">
                                                    <a href="http://klinikhewanrajanti.com" ><img class="header__logo" src="assets/klinik_rajanti_logo.jpeg" alt="Clinic Logo" style="display: block; border: 0;" width="100" height="auto"></a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table></td></tr></table><table style="min-width: 100%; " class="stylingblock-content-wrapper" width="100%" cellspacing="0" cellpadding="0"><tr><td class="stylingblock-content-wrapper camarker-inner"><table class="featured-story featured-story--top" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="padding-bottom: 20px;">
                                                    <table cellspacing="0" cellpadding="0">
                                                        <tr>
                                                            <td class="featured-story__inner" style="background: #fff;">
                                                                <table cellspacing="0" cellpadding="0">
                                                                    <tr>
                                                                        <td class="scalable-image" width="640" align="center">
                                                                            <a href="http://klinikhewanrajanti.com" ><img src="assets/klinik_rajanti_logo.jpeg" alt="Klinik Logo" style="display: block; border: 0; max-width: 100%; height: auto;" width="640"></a>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td class="featured-story__content-inner" style="padding: 32px 30px 45px;">
                                                                            <table cellspacing="0" cellpadding="0">
                                                                                <tr>
                                                                                    <td class="featured-story__heading featured-story--top__heading" style="background: #fff;" width="640" align="left">
                                                                                        <table cellspacing="0" cellpadding="0">
                                                                                            <tr>
                                                                                                <td style="font-family: Geneva, Tahoma, Verdana, sans-serif; font-size: 22px; color: #464646;" width="400" align="left">
                                                                                                    <a href="#"  style="text-decoration: none; color: #464646;">One last step to reset your password</a>
                                                                                                </td>
                                                                                            </tr>
                                                                                        </table>
                                                                                    </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td class="featured-story__copy" style="background: #fff;" width="640" align="center">
                                                                                        <table cellspacing="0" cellpadding="0">
                                                                                            <tr>
                                                                                                <td style="font-family: Geneva, Tahoma, Verdana, sans-serif; font-size: 16px; line-height: 22px; color: #555555; padding-top: 16px;" align="left">
                                                                                                   Please click the link below to confirm your password reset. You will be redirected to our reset password site.
                                                                                                </td>
                                                                                            </tr>
                                                                                        </table>
                                                                                    </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td class="button" style="font-family: Geneva, Tahoma, Verdana, sans-serif; font-size: 16px; padding-top: 26px;" width="640" align="left">
                                                                                        <a href="http://klinikhewanrajanti.com"  style="background: #0c99d5; color: #fff; text-decoration: none; border: 14px solid #0c99d5; border-left-width: 50px; border-right-width: 50px; text-transform: uppercase; display: inline-block;">
                                                                                            Confirm
                                                                                        </a>
                                                                                    </td>
                                                                                </tr>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table></td></tr></table></td>
                    </tr>
                    <tr>
                        <td class="footer" width="640" align="center" style="padding-top: 10px;">
                            <table cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="font-family: Geneva, Tahoma, Verdana, sans-serif; font-size: 14px; line-height: 18px; color: #738597; padding: 0 20px 40px;">
                                        <br>      <br>
                                        <strong>In the case you never request a password reset!</strong>
    
                                        <br>
    
                                        We understand your concern so, please let us know by clicking <a href="#"  style="color: #0c99d5;">here</a>
                                        if you never register using this email. We'll put a big flag beside the user account and
                                        pay close attention to it. Please allow us to let you know if there is any serious concern
                                        about this email regarding our clinic in the future.
    
                                        <br>
                                        <br>
                                        Klinik Hewan drh. Rajanti
                                        <br>
                                        Jl. Jati No.72, Pd. Jagung, Kec. Serpong Utara<br>
                                        Kota Tangerang Selatan, Banten 15323
                                        <br>
                                        <a href="https://klinikhewanrajanti.com">www.klinikhewanrajanti.com</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    
    <!-- Exact Target tracking code -->
    
    
    </custom></body>
    </html>`
    const mailjet = require('node-mailjet').connect(
        "7bf506041b35c090e3cdeb1cbfba29d3",
        "7c61d49060a4ac8c8935df27aeedd86c"
    )
    const request = mailjet.post('send', { version: 'v3.1' }).request({
        Messages: [
            {
                From: {
                    Email: 'hello@petfest.id',
                    Name: 'Pet Fest Indonesia',
                },
                To: [
                    {
                        Email: email,
                        Name: username,
                    },
                ],
                Subject: 'Reset Password Confirmation',
                TextPart: 'It has come to our notice that you have requested for a password reset. Please follow the instructions given in this email.',
                HTMLPart: html
            },
        ],
    })
    request
        .then(result => {
            console.log(result.body)
        })
        .catch(err => {
            console.log(err.statusCode)
        })
}
