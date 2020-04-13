var _ = require('lodash')

const isObjectArrEq = (a1, a2) => {
	if (a1.length != a2.length) return false

	let entries = JSON.stringify(a1)
	for (let i in a2) {
		if (entries.indexOf(JSON.stringify(a2[i])) === -1) {
			return false
		}
	}

	return true
}

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
		return a1 && a2 && _.isEqual(a1, a2)
	},

	isEqualOptions: (a1, a2) => {
		if (comparehelper.isEmpty(a1) && comparehelper.isEmpty(a2)) return true
		return a1 && a2 && isObjectArrEq(a1, a2)
	}
}

module.exports = comparehelper
