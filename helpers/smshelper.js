const smshelper = {
	trimEllipse: (text, length) => {
		return text.length > length ? text.substring(0, length) + '...' : text
	},

	// Verification SMS content
	createVerificationSMS: (phonenumber, firstname, token) => {
		return {
			body:
				'\n\nHello ' +
				smshelper.trimEllipse(firstname, 16) +
				', your verification code is: \n' +
				token +
				'\nThis code will expire in 30 minutes.',
			to: phonenumber,
			from: process.env.TWILIO_PHONE_NO
		}
	}
}

module.exports = smshelper
