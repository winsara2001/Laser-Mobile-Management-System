const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { getProducts, getProduct, addProduct, updateProduct, deleteProduct, getInventoryLogs } = require('../controllers/inventoryController');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let categoryFolder = 'Other';
        if (req.body.category === 'mobile') categoryFolder = 'Mobile Phones';
        else if (req.body.category === 'accessory') categoryFolder = 'Accessory';
        else if (req.body.category === 'part') categoryFolder = 'Spare Parts';
        
        const productName = req.body.name || 'Unnamed Product';
        // Sanitize product name for folder (remove invalid characters)
        const safeName = productName.replace(/[<>:"/\\|?*]+/g, '').trim();
        
        const targetPath = path.join(__dirname, '../../client/src/Images', categoryFolder, safeName);
        
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }
        
        cb(null, targetPath);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname.replace(/\s+/g, '-'));
    }
});
const upload = multer({ storage });

router.get('/logs', auth, getInventoryLogs);
router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', auth, upload.array('images', 5), addProduct);
router.put('/:id', auth, upload.array('images', 5), updateProduct);
router.delete('/:id', auth, deleteProduct);

module.exports = router;
