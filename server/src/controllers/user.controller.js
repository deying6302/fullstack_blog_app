import User from "../models/user.model.js";

export default {
  async searchUser(req, res) {
    try {
      const { query } = req.body;

      const findQuery = { "personal_info.username": new RegExp(query, "i") };

      const maxLimit = 50;

      const users = await User.find(findQuery)
        .select(
          "personal_info.profile_img personal_info.username personal_info.fullname -_id"
        )
        .limit(maxLimit);

      return res.status(200).json({ users });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  async getProfile(req, res) {
    try {
      const { username } = req.body;

      const user = await User.findOne({ "personal_info.username": username })
        .select(
          "-personal_info.password -google_auth -updatedAt -blogs"
        );

      return res.status(200).json(user);

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
};
