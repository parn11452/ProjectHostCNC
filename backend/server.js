//การ Import โมดูลต่างๆ
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
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

// การเชื่อมต่อ MongoDB
mongoose
  .connect("mongodb+srv://project:123456_Parn@projectcnc.8ljbk.mongodb.net/", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// การจัดการผู้ใช้งาน (Users)
const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);

// Order Schema and Model
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
    status: {
      type: String,
      default: "ได้รับคำสั่งซื้อ",
      enum: ["ได้รับคำสั่งซื้อ", "กำลังดำเนินการ", "กำลังจัดส่ง", "กำลังนำส่ง", "จัดส่งเรียบร้อย"], // Optional: enum for stricter validation
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", OrderSchema);

// Material Schema and Model
const MaterialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  size: { type: String, required: true },
  thickness: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: false },
  description: { type: String, required: true }
}, { timestamps: true });

const Material = mongoose.model("Material", MaterialSchema);

// Promotion Model
const PromotionSchema = new mongoose.Schema({
  title: String,
  description: String,
  image: String,
}, { timestamps: true });

const Promotion = mongoose.model('Promotion', PromotionSchema);

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

// Multer configuration *middleware ของ Node.js
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

// JWT token creation
const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

function authenticateToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.sendStatus(401);
  next();
}

// Import initial materials (this part can be left as is)

// const importMaterials = async () => {
//   try {
//     await Material.deleteMany();
//     await Material.insertMany(materials);
//     console.log("Materials imported successfully!");
//   } catch (error) {
//     console.error("Error importing materials:", error);
//   }
// };

// const materials = [
//   {
//     id: 1,
//     name: "พลาสวูด (Plaswood)",
//     size: "A4 (21x29.7 ซม.)",
//     thickness: "3 มม.",
//     price: 250,
//     description: "ทนทานต่อสภาพอากาศ ความชื้น และสารเคมี น้ำหนักเบา",
//   },
//   {
//     id: 2,
//     name: "พลาสวูด (Plaswood)",
//     size: "A4 (21x29.7 ซม.)",
//     thickness: "5 มม.",
//     price: 350,
//     description: "ทนทานต่อสภาพอากาศ ความชื้น และสารเคมี น้ำหนักเบา",
//   },
//   {
//     id: 3,
//     name: "พลาสวูด (Plaswood)",
//     size: "A4 (21x29.7 ซม.)",
//     thickness: "10 มม.",
//     price: 500,
//     description: "ทนทานต่อสภาพอากาศ ความชื้น และสารเคมี น้ำหนักเบา",
//   },
//   {
//     id: 4,
//     name: "พลาสวูด (Plaswood)",
//     size: "A3 (29.7x42 ซม.)",
//     thickness: "3 มม.",
//     price: 400,
//     description: "ทนทานต่อสภาพอากาศ ความชื้น และสารเคมี น้ำหนักเบา",
//   },
// ];

// importMaterials();

// Register API
app.post("/api/register", async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ fullName, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// Login API
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
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// GET endpoint to fetch materials
app.get("/api/materials", async (req, res) => {
  try {
    const materials = await Material.find();
    res.json(materials);
  } catch (error) {
    console.error("Error fetching materials:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// POST endpoint to create materials
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
    res.status(201).json({ message: "Material created successfully!", material: newMaterial });
  } catch (error) {
    console.error("Error creating material:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// GET endpoint ID
app.get("/api/materials/:id", async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ message: "Material not found" });
    res.json(material);
  } catch (error) {
    console.error("Error fetching material:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// PUT endpoint to update materials
app.put("/api/materials/:id", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const { name, size, thickness, price, description } = req.body;
  const updateData = { name, size, thickness, price, description };

  if (req.file) {
    updateData.image = req.file.path;
  }

  try {
    const updatedMaterial = await Material.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedMaterial) return res.status(404).json({ message: "Material not found" });
    res.json({ message: "Material updated successfully!", material: updatedMaterial });
  } catch (error) {
    console.error("Error updating material:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// DELETE endpoint to remove materials
app.delete("/api/materials/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await Material.findByIdAndDelete(id);
    res.json({ message: "Material deleted successfully!" });
  } catch (error) {
    console.error("Error deleting material:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Order Create API
app.post("/api/orders", async (req, res) => {
  const { materialId, name, email, phone, quantity, notes, address } = req.body;

  const material = await Material.findById(materialId);

  if (!material) {
    return res.status(400).json({ message: "Invalid material ID" });
  }

  if (!name || !phone || quantity <= 0) {
    return res.status(400).json({
      message: "All fields are required, and quantity must be greater than zero.",
    });
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
      },
    ],
    totalPrice: totalPrice,
  });

  try {
    await newOrder.save();
    res.status(201).json({ message: "Order created successfully!", order: newOrder });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//Get Order ByID
app.get("/api/orders/:id", async (req, res) => {
  const orderId = req.params.id;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get Orders API
app.get("/api/orders", async (req, res) => {
  try {
    const orders = await Order.find();
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get Orders by User Email API
app.get("/api/orders/user/:email", async (req, res) => {
  const userEmail = req.params.email;

  try {
    const orders = await Order.find({
      "userDetails.UserEmail": userEmail,
    });

    if (orders.length > 0) {
      res.status(200).json(orders);
    } else {
      res.status(404).json({ message: "No orders found for this user." });
    }
  } catch (error) {
    console.error("Error fetching orders by email:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// Update Order Status API
app.put("/api/orders/:orderId/status", async (req, res) => {
  const { status } = req.body;
  const { orderId } = req.params;

  // Validate the provided status
  const validStatuses = [
    "ได้รับคำสั่งซื้อ",
    "กำลังดำเนินการ",
    "กำลังจัดส่ง",
    "กำลังนำส่ง",
    "จัดส่งเรียบร้อย",
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = status;
    await order.save();

    res.status(200).json({ message: "Status updated successfully", order });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create Promotion
app.post("/api/promotions", upload.single("image"), async (req, res) => {
  const { title, description } = req.body;

  // Input validation
  if (!title || !description) {
    return res.status(400).json({ message: "Title and description are required" });
  }

  const image = req.file ? req.file.path : null;

  try {
    const newPromotion = new Promotion({ title, description, image });
    await newPromotion.save();
    res.status(201).json(newPromotion);
  } catch (error) {
    console.error("Error creating promotion:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get all Promotions
app.get("/api/promotions", async (req, res) => {
  try {
    const promotions = await Promotion.find();
    res.json(promotions);
  } catch (error) {
    console.error("Error fetching promotions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get Promotion by ID
app.get("/api/promotions/:id", async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }
    res.json(promotion);
  } catch (error) {
    console.error("Error fetching promotion:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update Promotion
app.put("/api/promotions/:id", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;

  // Input validation
  if (!title || !description) {
    return res.status(400).json({ message: "Title and description are required" });
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

// Delete Promotion
app.delete("/api/promotions/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedPromotion = await Promotion.findByIdAndDelete(id);
    if (!deletedPromotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }
    res.status(200).json({ message: "Promotion deleted successfully" });
  } catch (error) {
    console.error("Error deleting promotion:", error);
    res.status(500).json({ message: "Error deleting promotion", error });
  }
});

// Create Gallery Item
app.post('/api/gallery', upload.single('img'), async (req, res) => {
  const { title, description } = req.body;
  const img = req.file ? req.file.path : null;

  // Validate inputs
  if (!title || !description || !img) {
    return res.status(400).json({ message: "Title, description, and image are required" });
  }

  try {
    const newGalleryItem = new Gallery({ title, description, img });
    await newGalleryItem.save();
    res.status(201).json(newGalleryItem);
  } catch (error) {
    console.error("Error creating gallery item:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get All Gallery Items
app.get('/api/gallery', async (req, res) => {
  try {
    const galleryItems = await Gallery.find() ;
    res.json(galleryItems);
  } catch (error) {
    console.error("Error fetching gallery items:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get Gallery Item by ID
app.get('/api/gallery/:id', async (req, res) => {
  try {
    const galleryItem = await Gallery.findById(req.params.id);
    if (!galleryItem) {
      return res.status(404).json({ message: "Gallery item not found" });
    }
    res.json(galleryItem);
  } catch (error) {
    console.error("Error fetching gallery item:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update Gallery Item
app.put('/api/gallery/:id', upload.single('img'), async (req, res) => {
  const { title, description } = req.body;
  const updateData = { title, description };

  if (req.file) {
    updateData.img = req.file.path;
  }

  try {
    const updatedGalleryItem = await Gallery.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedGalleryItem) {
      return res.status(404).json({ message: "Gallery item not found" });
    }
    res.status(200).json(updatedGalleryItem);
  } catch (error) {
    console.error("Error updating gallery item:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete Gallery Item
app.delete('/api/gallery/:id', async (req, res) => {
  try {
    const deletedGalleryItem = await Gallery.findByIdAndDelete(req.params.id);
    if (!deletedGalleryItem) {
      return res.status(404).json({ message: "Gallery item not found" });
    }
    res.status(200).json({ message: "Gallery item deleted successfully" });
  } catch (error) {
    console.error("Error deleting gallery item:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
