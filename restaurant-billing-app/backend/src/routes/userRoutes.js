const express = require("express");
const UserController = require("../controllers/userController");
const router = express.Router();

// User routes
router.post("/", UserController.createUser);
router.get("/", UserController.getAllUsers);
router.get("/:initials", UserController.getUser);
router.put("/:id", UserController.updateUser);
router.delete("/:id", UserController.deleteUser);

module.exports = router;
