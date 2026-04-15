import api from '../../../lib/api'

export const courseChatApi = {
  /**
   * Fetch messages for a course section.
   * @param {string} courseId
   * @param {string|null} sectionId
   * @param {string|null} before - message id cursor for older messages
   */
  listMessages: (courseId, sectionId, before = null) => {
    const params = {}
    if (before) params.before = before
    return api.get(
      `/course-chat/${courseId}/sections/${sectionId ?? 'null'}/messages`,
      { params }
    )
  },

  /**
   * Send a text message.
   */
  sendMessage: (courseId, sectionId, content) =>
    api.post(`/course-chat/${courseId}/sections/${sectionId ?? 'null'}/messages`, {
      content,
    }),

  /**
   * Send a message with a file attachment (teacher only).
   * @param {FormData} formData - must include 'file' and optionally 'content'
   */
  sendMessageWithFile: (courseId, sectionId, formData) =>
    api.post(
      `/course-chat/${courseId}/sections/${sectionId ?? 'null'}/messages`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),

  /**
   * Toggle a reaction on a message.
   * @param {string} courseId
   * @param {string|null} sectionId
   * @param {string} messageId
   * @param {'like'|'unlike'|'love'|'ok'|'done'} type
   */
  toggleReaction: (courseId, sectionId, messageId, type) =>
    api.post(
      `/course-chat/${courseId}/sections/${sectionId ?? 'null'}/messages/${messageId}/reactions`,
      { type }
    ),

  /**
   * Get course members for @mention dropdown.
   */
  getMembers: (courseId, sectionId) =>
    api.get(`/course-chat/${courseId}/sections/${sectionId ?? 'null'}/members`),

  /**
   * Delete a message (soft delete, own messages only / admin).
   */
  deleteMessage: (courseId, sectionId, messageId) =>
    api.delete(
      `/course-chat/${courseId}/sections/${sectionId ?? 'null'}/messages/${messageId}`
    ),
}
