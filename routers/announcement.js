const express = require('express')
const router = express.Router()

const AnnouncementsController = require('../controllers/announcements')
const auth = require('../middleware/auth')

router.get('/', AnnouncementsController.getPSA)
router.get('/all', auth, AnnouncementsController.getAllAnnouncements)
router.get('/:psaID', AnnouncementsController.getAnnouncement)
router.post('/', auth, AnnouncementsController.createAnnouncement)
router.patch('/:psaID', auth, AnnouncementsController.patchAnnouncement)
router.delete('/:psaID', auth, AnnouncementsController.deleteAnnouncement)

module.exports = router
