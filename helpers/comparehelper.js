const comparehelper = {
	isEmpty: obj => {
		if (typeof obj == 'undefined') return true
		if (obj == null) return true
		if (obj.length == 0) return true
		for (let key in obj) {
			if (hasOwnProperty.call(obj, key)) return false
		}

		return true
	},

	isEqual: (a1, a2) => {
		if (comparehelper.isEmpty(a1) && comparehelper.isEmpty(a2)) return true

		return (
			a1 &&
			a2 &&
			a1.length === a2.length &&
			JSON.stringify(a1) === JSON.stringify(a2)
		)
	}
}

module.exports = comparehelper
