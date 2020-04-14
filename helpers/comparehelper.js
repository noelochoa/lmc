var _ = require('lodash')

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

	isEqArr: (a1, a2) => {
		if (comparehelper.isEmpty(a1) && comparehelper.isEmpty(a2)) return true

		const arr1 = JSON.parse(JSON.stringify(_.compact(a1, _.isNil)))
		const arr2 = JSON.parse(JSON.stringify(_.compact(a2, _.isNil)))
		return _(_.xorWith(arr1, arr2, _.isEqual)).isEmpty()
	}
}

module.exports = comparehelper
