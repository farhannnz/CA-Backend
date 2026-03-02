const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const auth = require('../middleware/auth');

router.post('/', auth, clientController.addClient);
router.get('/', auth, clientController.getClients);
router.get('/:id', auth, clientController.getClient);
router.delete('/:id', auth, clientController.deleteClient);

module.exports = router;
