const { UserModel } = require("../models/userModel");

class UserController {
  static async createUser(req, res) {
    try {
      const user = await UserModel.create(req.body);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getUser(req, res) {
    try {
      const user = await UserModel.findOne({ initials: req.params.initials });
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getAllUsers(req, res) {
    try {
      const users = await UserModel.find({});
      res.json(users);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateUser(req, res) {
    try {
      const user = await UserModel.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteUser(req, res) {
    try {
      await UserModel.findByIdAndDelete(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = UserController;
