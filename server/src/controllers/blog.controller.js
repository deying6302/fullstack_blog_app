import { nanoid } from "nanoid";
import Blog from "../models/blog.model.js";
import User from "../models/user.model.js";

function validateBlogData(title, desc, banner, tags, content, draft) {
  if (!draft) {
    if (!desc.length || desc.length > 200)
      return "Blog description must be under 200 characters";
    if (!banner.length) return "You must provide a banner to publish the blog";
    if (!content.blocks.length)
      return "There must be some blog content to publish it";
    if (!tags.length || tags.length > 10)
      return "You must provide tags, Maximum 10";
  }

  if (!title.length) return "You must provide a title to publish the blog";

  return null;
}

export default { 
  async latestBlog(req, res) {
    try {
      const { page } = req.body;

      if (!page || page < 1) {
        return res.status(400).json({ error: "Invalid page number" });
      }

      const maxLimit = 5;
      const skipCount = (page - 1) * maxLimit;
      
      const blogs = await Blog.find({ draft: false })
        .populate(
          "author",
          "personal_info.profile_img personal_info.username personal_info.fullname -_id"
        )
        .sort({ publishedAt: -1 })
        .select("blog_id title desc banner activity tags publishedAt -_id")
        .skip(skipCount)
        .limit(maxLimit);

      return res.status(200).json({ blogs });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  async allLatestBlogCount(req, res) {
    try {
      const count = await Blog.countDocuments({ draft: false });
      
      return res.status(200).json({ totalDocs: count });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  async getTrendingBlog(req, res) {
    try {
      const maxLimit = 5;
      const blogs = await Blog.find({ draft: false })
        .populate(
          "author",
          "personal_info.profile_img personal_info.username personal_info.fullname -_id"
        )
        .sort({ "activity.total_read": -1, "activity.total_likes": -1, "publishedAt": -1 })
        .select("blog_id title publishedAt -_id")
        .limit(maxLimit);

      return res.status(200).json({ blogs });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  async filterBlog(req, res) {
    try {
      const { tag, page } = req.body;

      if (!page || page < 1) {
        return res.status(400).json({ error: "Invalid page number" });
    }

      const findQuery = { tags: tag, draft: false };

      const maxLimit = 2;
      const skipCount = (page - 1) * maxLimit;

      const blogs = await Blog.find(findQuery)
        .populate(
          "author",
          "personal_info.profile_img personal_info.username personal_info.fullname -_id"
        )
        .sort({ "publishedAt": -1 })
        .select("blog_id title desc banner activity tags publishedAt -_id")
        .skip(skipCount)
        .limit(maxLimit);

      return res.status(200).json({ blogs });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }, 

  async filterBlogCount(req, res) {
    try {
      const { tag } = req.body;

      const findQuery = { tags: tag, draft: false };

      const count = await Blog.countDocuments(findQuery);

      return res.status(200).json({ totalDocs: count });
      
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  async searchBlog(req, res) {
    try {
      const { tag, query, page, author, limit, eliminate_blog } = req.body;

      if (!page || page < 1) {
        return res.status(400).json({ error: "Invalid page number" });
      }

      const maxLimit = limit ? limit : 2;
      const skipCount = (page - 1) * maxLimit;

      let findQuery = { draft: false };

      if (tag) {
        findQuery.tags = tag;
        findQuery.blog_id = { $ne: eliminate_blog };
      } else if (query) {
        findQuery.title = new RegExp(query, "i");
      } else if (author) {
        findQuery.author = author;
      }

      const blogs = await Blog.find(findQuery)
        .populate(
          "author",
          "personal_info.profile_img personal_info.username personal_info.fullname -_id"
        )
        .sort({ publishedAt: -1 })
        .select("blog_id title desc banner activity tags publishedAt -_id")
        .skip(skipCount)
        .limit(maxLimit);

      return res.status(200).json({ blogs });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  async searchBlogCount(req, res) {
    try {
      const { tag, query } = req.body;

      let findQuery = { draft: false };

      if (tag) {
        findQuery.tags = tag;
      } else if (query) {
        findQuery.title = new RegExp(query, "i");
      }

      const count = await Blog.countDocuments(findQuery);

      return res.status(200).json({ totalDocs: count });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  async createBlog(req, res) {
    try {
      const authorId = req.user;
      const { title, desc, banner, tags, content, draft } = req.body;

      // Validate input data
      const validationError = validateBlogData(
        title,
        desc,
        banner,
        tags,
        content,
        draft
      );

      if (validationError) {
        return res.status(403).json({ error: validationError });
      }

      // Format tags
      const formattedTags = tags.map((tag) => tag.toLowerCase());

      // Create blog_id unique
      const blog_id =
        title
          .replace(/[^a-zA-Z0-9]/g, " ")
          .replace(/\s+/g, "-")
          .trim() + nanoid();

      // Create blog object
      const newBlog = new Blog({
        title,
        desc,
        banner,
        content,
        tags: formattedTags,
        author: authorId,
        blog_id,
        draft: Boolean(draft),
      });

      // Save blog in database
      const savedBlog = await newBlog.save();

      // Update information user
      const incrementVal = draft ? 0 : 1;
      await User.findOneAndUpdate(
        { _id: authorId },
        {
          $inc: { "account_info.total_posts": incrementVal },
          $push: { blogs: savedBlog._id },
        }
      );

      // Return id of new blog
      return res.status(200).json({ id: savedBlog.blog_id });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  async getBlog(req, res) {
    try {
      const { blog_id } = req.body;

      const incrementVal = 1;

      const blog = await Blog.findOneAndUpdate({ blog_id }, { $inc : { "activity.total_reads": incrementVal } })
        .populate(
          "author",
          "personal_info.fullname personal_info.username personal_info.profile_img"
        )
        .select("title desc content banner activity publishedAt blog_id tags")
      
      User.findOneAndUpdate({ "personal_info.username": blog.author.personal_info.username }, {
        $inc : { "account_info.total_reads": incrementVal }
      })

      return res.status(200).json({ blog });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
};
