const mailhelper = {
	trimEllipse: (text, length) => {
		return text.length > length ? text.substring(0, length) + '...' : text
	},

	// Verification mail content
	createVerificationMail: (email, firstname, token) => {
		return {
			from: 'LMC Web Support <' + process.env.SENDGRID_EMAIL_FROM + '>',
			to: email,
			subject: '[LMC] Account Verification Code',
			text:
				'Hello ' +
				mailhelper.trimEllipse(firstname, 32) +
				',\n\n' +
				'Thank you for registering in our site!\n' +
				'Please use this verification code if you wish to order from us: \n\n' +
				token +
				'\n\nThis code will expire in 30 minutes. You may request a new code in your profile page.\n' +
				'This is an automated message for verification. Please do not reply to this email.\n\n' +
				'Thanks,\n' +
				'LMC Web Support Team\n',
			html:
				'<html>' +
				'Hello ' +
				mailhelper.trimEllipse(firstname, 32) +
				',<br/>' +
				'<p>Thank you for registering in our site!<br/>' +
				'Please use this verification code if you wish to order from us: </p>' +
				'<h2>' +
				token +
				'</h2>' +
				'<p><i>This code will expire in 30 minutes. You may request a new code in your profile page.<br/>' +
				'This is an automated message for verification. Please do not reply to this email.</i><p>' +
				'Thanks, <br/>' +
				'LMC Web Support Team' +
				'</html>'
		}
	}
}

module.exports = mailhelper
