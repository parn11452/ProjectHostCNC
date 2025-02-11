//การ Import โมดูลต่างๆ
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

//การตั้งค่า Express
const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

mongoose
  .connect("mongodb+srv://project:123456_Parn@projectcnc.8ljbk.mongodb.net/", {})
  .then(() => console.log("เชื่อมต่อ MongoDB สำเร็จ"))
  .catch((err) => console.error("เกิดข้อผิดพลาดในการเชื่อมต่อ MongoDB:", err));

// Schema และ Model สำหรับผู้ใช้งาน (Users)
const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);

// Schema และ Model สำหรับคำสั่งซื้อ (Orders)
const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    items: [
      {
        productId: { type: String, required: true },
        productName: { type: String, required: true },
        size: { type: String, required: true },
        thickness: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    userDetails: [
      {
        Username: { type: String, required: true },
        UserEmail: { type: String, required: false },
        UserPhone: { type: String, required: true },
        UserNotes: { type: String, required: false },
        UserAddress: { type: String, required: false },
      },
    ],
    totalPrice: { type: Number, required: true },
    estimatedPrice: { type: Number, default: 0 },
    netPrice: { type: Number, default: 0 },
    aiFile: { type: String, required: false },
    paymentSlip: { type: String, required: false },
    orderDate: { type: Date, required: true },

    status: {
      type: String,
      default: "ได้รับคำสั่งซื้อ",
      enum: [
        "ได้รับคำสั่งซื้อ",
        "ตรวจสอบไฟล์งาน",
        "ตรวจสอบการโอนเงิน",
        "กำลังดำเนินการ",
        "กำลังจัดส่ง",
        "จัดส่งเรียบร้อย",
      ],
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", OrderSchema);

// Schema และ Model สำหรับวัสดุ (Materials)
const MaterialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  size: { type: String, required: true },
  thickness: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: false },
  description: { type: String, required: true }
}, { timestamps: true });

const Material = mongoose.model("Material", MaterialSchema);

// Schema และ Model สำหรับโปรโมชั่น (Promotions)
const PromotionSchema = new mongoose.Schema({
  title: String,
  description: String,
  image: String,
}, { timestamps: true });

const Promotion = mongoose.model('Promotion', PromotionSchema);

// Schema และ Model สำหรับแกลเลอรี (Gallery)
const gallerySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  img: {
    type: String,
    required: false,
  },
}, { timestamps: true });

const Gallery = mongoose.model('Gallery', gallerySchema);

// การตั้งค่า Multer สำหรับการอัพโหลดไฟล์
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// สร้าง JWT Token
const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

// Middleware สำหรับตรวจสอบ Token
function authenticateToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.sendStatus(401);
  next();
}

// API สำหรับการลงทะเบียนผู้ใช้งาน
app.post("/api/register", async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "ผู้ใช้งานนี้มีอยู่แล้ว!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ fullName, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "ลงทะเบียนผู้ใช้งานสำเร็จ!" });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการลงทะเบียน:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// API สำหรับการเข้าสู่ระบบ
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "อีเมลล์หรือรหัสผ่านไม่ถูกต้อง" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "อีเมลล์หรือรหัสผ่านไม่ถูกต้อง" });
    }

    const token = createToken(user._id);
    res.status(200).json({
      token,
      user: {
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการเข้าสู่ระบบ:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// API สำหรับดึงข้อมูลวัสดุทั้งหมด
app.get("/api/materials", async (req, res) => {
  try {
    const materials = await Material.find();
    res.json(materials);
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการดึงข้อมูลวัสดุ:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// API สำหรับสร้างวัสดุใหม่
app.post("/api/materials", upload.single("image"), async (req, res) => {
  const { name, size, thickness, price, description } = req.body;
  const image = req.file ? req.file.path : null;

  const newMaterial = new Material({
    name,
    size,
    thickness,
    price,
    image,
    description,
  });

  try {
    await newMaterial.save();
    res.status(201).json({ message: "สร้างวัสดุสำเร็จ!", material: newMaterial });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการสร้างวัสดุ:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// API สำหรับดึงข้อมูลวัสดุโดย ID
app.get("/api/materials/:id", async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ message: "ไม่พบวัสดุ" });
    res.json(material);
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการดึงข้อมูลวัสดุ:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// API สำหรับอัพเดทข้อมูลวัสดุ
app.put("/api/materials/:id", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const { name, size, thickness, price, description } = req.body;
  const updateData = { name, size, thickness, price, description };

  if (req.file) {
    updateData.image = req.file.path;
  }

  try {
    const updatedMaterial = await Material.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedMaterial) return res.status(404).json({ message: "ไม่พบวัสดุ" });
    res.json({ message: "อัพเดทวัสดุสำเร็จ!", material: updatedMaterial });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการอัพเดทวัสดุ:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// API สำหรับลบวัสดุ
app.delete("/api/materials/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await Material.findByIdAndDelete(id);
    res.json({ message: "ลบวัสดุสำเร็จ!" });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการลบวัสดุ:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// API สำหรับสร้างคำสั่งซื้อ
app.post("/api/orders", upload.single("aiFile"), async (req, res) => {
  try {
    const orderData = JSON.parse(req.body.orderData);
    const { materialId, name, email, phone, quantity, notes, address, paymentMethod, orderDate } = orderData;

    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(400).json({ message: "รหัสวัสดุไม่ถูกต้อง" });
    }

    const totalPrice = material.price * quantity;

    const newOrder = new Order({
      items: [
        {
          productId: material._id,
          productName: material.name,
          size: material.size,
          thickness: material.thickness,
          quantity: quantity,
          price: material.price,
        },
      ],
      userDetails: [
        {
          Username: name,
          UserEmail: email,
          UserPhone: phone,
          UserNotes: notes,
          UserAddress: address,
          PaymentMethod: paymentMethod,
        },
      ],
      totalPrice: totalPrice,
      aiFile: req.file ? req.file.path : null,
      orderDate: orderDate,
    });

    await newOrder.save();
    res.status(201).json({ message: "สร้างคำสั่งซื้อสำเร็จ!", order: newOrder });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// API สำหรับดึงข้อมูลคำสั่งซื้อโดย ID
app.get("/api/orders/:id", async (req, res) => {
  const orderId = req.params.id;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "ไม่พบคำสั่งซื้อ" });
    }
    res.status(200).json(order);
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการดึงข้อมูลคำสั่งซื้อ:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// API สำหรับดึงข้อมูลคำสั่งซื้อทั้งหมด
app.get("/api/orders", async (req, res) => {
  try {
    const orders = await Order.find();
    res.status(200).json(orders);
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการดึงข้อมูลคำสั่งซื้อ:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// API สำหรับดึงข้อมูลคำสั่งซื้อโดยอีเมลล์ผู้ใช้งาน
app.get("/api/orders/user/:email", async (req, res) => {
  const userEmail = req.params.email;

  try {
    const orders = await Order.find({
      "userDetails.UserEmail": userEmail,
    });

    if (orders.length > 0) {
      res.status(200).json(orders);
    } else {
      res.status(404).json({ message: "ไม่พบคำสั่งซื้อสำหรับผู้ใช้งานนี้" });
    }
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการดึงข้อมูลคำสั่งซื้อ:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// API สำหรับอัพเดทสถานะคำสั่งซื้อ
app.put("/api/orders/:orderId/status", async (req, res) => {
  const { status } = req.body;
  const { orderId } = req.params;

  const validStatuses = [
    "ได้รับคำสั่งซื้อ",
    "ตรวจสอบไฟล์งาน",
    "ตรวจสอบการโอนเงิน",
    "กำลังดำเนินการ",
    "กำลังจัดส่ง",
    "จัดส่งเรียบร้อย",
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "สถานะไม่ถูกต้อง" });
  }

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "ไม่พบคำสั่งซื้อ" });
    }

    order.status = status;
    await order.save();

    res.status(200).json({ message: "อัพเดทสถานะสำเร็จ", order });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการอัพเดทสถานะ:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// API สำหรับอัพเดทราคาประเมินคำสั่งซื้อ
app.put("/api/orders/:orderId/price", async (req, res) => {
  const { orderId } = req.params;
  const { estimatedPrice } = req.body;

  if (isNaN(estimatedPrice) || estimatedPrice < 0) {
    return res.status(400).json({ message: "ราคาประเมินไม่ถูกต้อง" });
  }

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "ไม่พบคำสั่งซื้อ" });
    }

    order.estimatedPrice = estimatedPrice;
    order.netPrice = order.totalPrice + estimatedPrice

    await order.save();

    res.status(200).json({ message: "อัพเดทราคาประเมินสำเร็จ", order });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการอัพเดทราคาประเมิน:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// API สำหรับอัพโหลดสลิปการโอนเงิน
app.post("/api/orders/upload-slip/:orderId", upload.single("paymentSlip"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "ไม่พบไฟล์ที่อัพโหลด" });
  }

  try {
    const filePath = path.join("uploads", req.file.filename);

    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { paymentSlip: filePath },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: "ไม่พบคำสั่งซื้อ" });
    }

    order.status = "ตรวจสอบการโอนเงิน";
    await order.save();

    res.status(200).json({
      success: true,
      message: "อัพโหลดสลิปการโอนเงินและอัพเดทสถานะสำเร็จ",
      order,
    });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการอัพโหลดสลิป:", error);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// API สำหรับสร้างโปรโมชั่น
app.post("/api/promotions", upload.single("image"), async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({ message: "กรุณากรอกชื่อและรายละเอียดโปรโมชั่น" });
  }

  const image = req.file ? req.file.path : null;

  try {
    const newPromotion = new Promotion({ title, description, image });
    await newPromotion.save();
    res.status(201).json(newPromotion);
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการสร้างโปรโมชั่น:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// API ดึงข้อมูลโปรโมชั่นทั้งหมด
app.get("/api/promotions", async (req, res) => {
  try {
    const promotions = await Promotion.find();
    res.json(promotions);
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการดึงข้อมูลโปรโมชั่น:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// API ดึงข้อมูลโปรโมชั่นตาม ID
app.get("/api/promotions/:id", async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) {
      return res.status(404).json({ message: "ไม่พบโปรโมชั่นที่ต้องการ" });
    }
    res.json(promotion);
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการดึงข้อมูลโปรโมชั่น:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// API อัปเดตข้อมูลโปรโมชั่น
app.put("/api/promotions/:id", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({ message: "กรุณากรอกชื่อและรายละเอียดโปรโมชั่น" });
  }

  const updateData = { title, description };

  if (req.file) {
    updateData.image = req.file.path;
  }

  try {
    const updatedPromotion = await Promotion.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedPromotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    res.status(200).json(updatedPromotion);
  } catch (error) {
    console.error("Error updating promotion:", error);
    res.status(500).json({ message: "Error updating promotion", error });
  }
});

// API ลบโปรโมชั่น
app.delete("/api/promotions/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedPromotion = await Promotion.findByIdAndDelete(id);
    if (!deletedPromotion) {
      return res.status(404).json({ message: "ไม่พบโปรโมชั่นที่ต้องการลบ" });
    }
    res.status(200).json({ message: "ลบโปรโมชั่นเรียบร้อยแล้ว" });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการลบโปรโมชั่น:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบโปรโมชั่น", error });
  }
});

// API สร้างรายการแกลเลอรี
app.post('/api/gallery', upload.single('img'), async (req, res) => {
  const { title, description } = req.body;
  const img = req.file ? req.file.path : null;

  if (!title || !description || !img) {
    return res.status(400).json({ message: "กรุณากรอกชื่อ คำอธิบาย และอัปโหลดรูปภาพ" });
  }

  try {
    const newGalleryItem = new Gallery({ title, description, img });
    await newGalleryItem.save();
    res.status(201).json(newGalleryItem);
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการเพิ่มรายการแกลเลอรี:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// API ดึงข้อมูลแกลเลอรีทั้งหมด
app.get('/api/gallery', async (req, res) => {
  try {
    const galleryItems = await Gallery.find();
    res.json(galleryItems);
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการดึงข้อมูลแกลเลอรี:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// API ดึงข้อมูลแกลเลอรีตาม ID
app.get('/api/gallery/:id', async (req, res) => {
  try {
    const galleryItem = await Gallery.findById(req.params.id);
    if (!galleryItem) {
      return res.status(404).json({ message: "ไม่พบรายการแกลเลอรีที่ต้องการ" });
    }
    res.json(galleryItem);
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการดึงข้อมูลแกลเลอรี:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// API อัปเดตรายการแกลเลอรี
app.put('/api/gallery/:id', upload.single('img'), async (req, res) => {
  const { title, description } = req.body;
  const updateData = { title, description };

  if (req.file) {
    updateData.img = req.file.path;
  }

  try {
    const updatedGalleryItem = await Gallery.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedGalleryItem) {
      return res.status(404).json({ message: "ไม่พบรายการแกลเลอรีที่ต้องการ" });
    }
    res.status(200).json(updatedGalleryItem);
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการอัปเดตรายการแกลเลอรี:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// API ลบรายการแกลเลอรี
app.delete('/api/gallery/:id', async (req, res) => {
  try {
    const deletedGalleryItem = await Gallery.findByIdAndDelete(req.params.id);
    if (!deletedGalleryItem) {
      return res.status(404).json({ message: "ไม่พบรายการแกลเลอรีที่ต้องการลบ" });
    }
    res.status(200).json({ message: "ลบรายการแกลเลอรีเรียบร้อยแล้ว" });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการลบรายการแกลเลอรี:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// ตั้งค่าพอร์ตเซิร์ฟเวอร์
const PORT = process.env.PORT || 3000;

// เสิร์ฟไฟล์ static จากโฟลเดอร์ frontend
app.use(express.static(path.resolve(__dirname, '..', 'frontend')));

// เสิร์ฟไฟล์ gallery.html เมื่อเข้าถึง path '/'
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'frontend', 'gallery.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});