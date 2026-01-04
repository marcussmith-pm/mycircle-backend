import { Reaction } from '../models/Reaction.js';
import { Post } from '../models/Post.js';
import { User } from '../models/User.js';

/**
 * Get reactions for a post
 * GET /v1/posts/:postId/reactions
 */
export const getReactions = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { postId } = req.params;

    // Validate user
    const user = await User.findByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Not Found', message: 'Post not found' });
    }

    // Get user's reaction (if any)
    const userReaction = await Reaction.getUserReaction(postId, user.id);

    // Get reaction counts (only for post owner)
    let counts = {};
    if (post.owner_user_id === user.id) {
      counts = await Reaction.getCountsByPostId(postId, user.id);
    }

    res.status(200).json({
      user_reaction: userReaction ? userReaction.reaction_type : null,
      counts: post.owner_user_id === user.id ? counts : {}
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add or update a reaction
 * POST /v1/posts/:postId/reactions
 */
export const setReaction = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { postId } = req.params;
    const { reaction_type } = req.body;

    // Validate user
    const user = await User.findByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    // Validate post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Not Found', message: 'Post not found' });
    }

    // Validate reaction type
    const validReactions = ['like', 'love', 'laugh', 'wow', 'sad', 'angry'];
    if (!reaction_type || !validReactions.includes(reaction_type)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid reaction_type. Must be one of: ${validReactions.join(', ')}`
      });
    }

    // Set reaction
    const reaction = await Reaction.upsert(postId, user.id, reaction_type);

    res.status(201).json({
      id: reaction.id,
      post_id: reaction.post_id,
      reaction_type: reaction.reaction_type,
      created_at: reaction.created_at
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a reaction
 * DELETE /v1/posts/:postId/reactions
 */
export const removeReaction = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { postId } = req.params;
    const { reaction_type } = req.query;

    // Validate user
    const user = await User.findByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    // Validate post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Not Found', message: 'Post not found' });
    }

    // Remove reaction
    const deleted = await Reaction.remove(postId, user.id, reaction_type);

    if (!deleted) {
      return res.status(404).json({ error: 'Not Found', message: 'Reaction not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Reaction removed'
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getReactions,
  setReaction,
  removeReaction
};
