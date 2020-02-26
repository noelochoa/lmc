const mailhelper = {
	// Mail service credentials
	getMailerService: function() {
		return {
			service: process.env.VERIFY_EMAIL_SERVICE,
			auth: {
				user: process.env.VERIFY_EMAIL_AUTHUSER,
				pass: process.env.VERIFY_EMAIL_AUTHPASS
			}
		}
	},
	// Verification mail content
	createVerificationMail: function(email, firstname, token) {
		return {
			from: 'LMC Web Support <' + process.env.VERIFY_EMAIL_FROM + '>',
			to: email,
			subject: '[LMC] Account Verification Code',
			text:
				'Hello ' +
				firstname +
				',\n\n' +
				'Thank you for registering in our site!\n' +
				'Please enter the verification code if you wish to order from us: \n\n' +
				token +
				'\n\nThis code will expire in 30 minutes. You may request a new code in your profile page.\n' +
				'This is an automated message for verification. Please do not reply to this email.\n\n' +
				'Thanks,\n' +
				'LMC Web Support Team\n',
			html:
				'<html>' +
				'Hello ' +
				firstname +
				',<br/><br/>' +
				'Thank you for registering in our site!<br/>' +
				'Please enter the verification code if you wish to order from us: <br/>' +
				'<h2>' +
				token +
				'</h2>' +
				'<p><small>This code will expire in 30 minutes. You may request a new code in your profile page.<br/>' +
				'This is an automated message for verification. Please do not reply to this email.</small><p>' +
				'Thanks, <br/>' +
				'LMC Web Support Team' +
				'</html>'
		}
	}
}

module.exports = mailhelper
