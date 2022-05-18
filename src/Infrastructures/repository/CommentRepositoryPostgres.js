const NotFoundError = require('../../Commons/exceptions/NotFoundError');
const AddedComment =
    require('../../Domains/comments/entities/AddedComment');
const CommentRepository =
    require('../../Domains/comments/CommentRepository');
const AuthorizationError =
    require('../../Commons/exceptions/AuthorizationError');

class CommentRepositoryPostgres extends CommentRepository {
  constructor(pool, idGenerator) {
    super();
    this._pool = pool;
    this._idGenerator = idGenerator;
  }

  async addComment(newComment) {
    const {content, threadId, owner} = newComment;
    const id = `comments-${this._idGenerator()}`;

    const query = `INSERT INTO comments (id, content, thread_id, owner)
                    VALUES ($1, $2, $3, $4) RETURNING id, content, owner`;
    const values = [id, content, threadId, owner];

    const {rows} = await this._pool.query(query, values);

    return new AddedComment({...rows[0]});
  }

  async getCommentsByThreadId(threadId) {
    const query = {
      text: `SELECT * FROM comments WHERE thread_id = $1 ORDER BY date DESC`,
      values: [threadId],
    };

    const {rows} = await this._pool.query(query);

    return rows.map((row) => new AddedComment({...row}));
  }

  async deleteCommentById(id) {
    const query = {
      text: `UPDATE comments SET deleted = true WHERE id = $1
              RETURNING id`,
      values: [id],
    };

    const {rowCount} = await this._pool.query(query);

    if (rowCount === 0) {
      throw new NotFoundError(`comment not found`);
    }
  }

  async verifyComment(id, userId, threadId) {
    const query = {
      text: `SELECT id, owner, thread_id FROM comments WHERE id = $1`,
      values: [id],
    };

    const {rows} = await this._pool.query(query);

    if (rows.length === 0) {
      throw new NotFoundError(`comment not found`);
    }

    const {owner, thread_id: otherThreadId} = rows[0];

    if (threadId !== otherThreadId) {
      throw new NotFoundError(`thread not found`);
    }

    if (owner !== userId) {
      throw new AuthorizationError('not comment\'s owner');
    }
  }
}

module.exports = CommentRepositoryPostgres;
