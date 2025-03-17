const crypto = require('crypto');
const sendEmail = require('../utils/email');

const invitationService = {
  /**
   * Create invitation token and add to entity invitations array
   * @param {Object} entity - The entity object (board or workspace)
   * @param {String} email - The invitee's email
   * @param {String} role - The role to assign
   * @param {String} invitedBy - User ID who sent the invitation
   * @returns {String} - The invitation token
   */
  createInvitationToken(entity, email, role, invitedBy) {
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(inviteToken)
      .digest('hex');

    entity.invitations.push({
      email,
      role,
      invitedBy,
      token: hashedToken,
      tokenExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      status: 'pending',
      createdAt: new Date(),
    });

    return inviteToken;
  },

  /**
   * Verify invitation token for an entity
   * @param {Object} entity - The entity to check (board or workspace)
   * @param {String} token - The token to verify
   * @returns {Object} - The invitation if valid
   */
  verifyInvitationToken(entity, token) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    return entity.invitations.find(
      (inv) =>
        inv.token === hashedToken &&
        inv.status === 'pending' &&
        inv.tokenExpiresAt > Date.now()
    );
  },

  /**
   * Send invitation email
   * @param {String} email - The recipient's email
   * @param {String} inviteUrl - The invitation URL
   * @param {String} entityName - Name of the entity (board or workspace)
   * @param {String} role - The assigned role
   * @param {String} entityType - Type of entity ('board' or 'workspace')
   */
  async sendInvitationEmail(email, inviteUrl, entityName, role, entityType) {
    const message = `
      <div style="background-color: #f6f9fc; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background-color: white; padding: 20px; border-radius: 10px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #4d2d61; text-align: center; font-size: 24px; margin-bottom: 20px;">${
            entityType.charAt(0).toUpperCase() + entityType.slice(1)
          } Invitation</h2>
          <p style="color: #24152d; text-align: center; font-size: 16px;">You've been invited to join "${entityName}" ${entityType}.</p>
          <p style="color: #24152d; text-align: center; font-size: 14px;">Role: ${role}</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #4d2d61; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #24152d; text-align: center; font-size: 14px;">
            ${
              entityType === 'board'
                ? "Once accepted, you'll find this board in your collaboration workspace."
                : ''
            }
          </p>
          <p style="color: #24152d; font-size: 14px; text-align: center; margin-bottom: 20px;">This invitation expires in 7 days.</p>
          <hr style="border: none; border-top: 1px solid #e6e6e6; margin: 20px 0;">
          <p style="color: #888; font-size: 12px; text-align: center;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      </div>
    `;

    await sendEmail({
      email,
      subject: `Invitation to join ${entityName} ${entityType}`,
      message,
    });
  },

  /**
   * Process multiple invitations in a single request with standardized format
   * @param {Object} entity - The entity object (board or workspace)
   * @param {Array} invites - Array of invites with email and role
   * @param {String} invitedBy - User ID who sent the invitations
   * @param {String} entityType - Type of entity ('board' or 'workspace')
   * @param {String} baseUrl - Base URL for invitation links
   * @returns {Object} - Results of invitation process
   */
  async processBulkInvitations(
    entity,
    invites,
    invitedBy,
    entityType,
    baseUrl
  ) {
    if (!Array.isArray(invites)) {
      throw new Error('Invites must be an array');
    }

    const results = [];

    for (const invite of invites) {
      const { email, role = 'member' } = invite;

      try {
        // Create invitation token
        const inviteToken = this.createInvitationToken(
          entity,
          email,
          role,
          invitedBy
        );

        // Generate invitation URL
        const inviteUrl = `${baseUrl}/${entityType}s/join/${inviteToken}`;

        // Send email
        await this.sendInvitationEmail(
          email,
          inviteUrl,
          entity.name,
          role,
          entityType
        );

        // Record successful invitation
        results.push({ email, role, status: 'sent' });
      } catch (error) {
        // Remove the failed invitation from entity
        entity.invitations = entity.invitations.filter(
          (inv) =>
            !(
              inv.email === email &&
              inv.invitedBy.toString() === invitedBy.toString() &&
              inv.status === 'pending'
            )
        );
      }
    }

    return results;
  },

  /**
   * Clean expired invitations from entity
   * @param {Object} entity - The entity object (board or workspace)
   * @returns {Number} - Number of expired invitations cleaned
   */
  cleanExpiredInvitations(entity) {
    if (!entity.invitations || !Array.isArray(entity.invitations)) {
      return 0;
    }

    const initialCount = entity.invitations.length;

    // Mark expired invitations
    entity.invitations.forEach((invitation) => {
      if (
        invitation.tokenExpiresAt < Date.now() &&
        invitation.status === 'pending'
      ) {
        invitation.status = 'expired';
      }
    });

    return (
      initialCount -
      entity.invitations.filter((inv) => inv.status === 'pending').length
    );
  },

  /**
   * Cancel invitation by email
   * @param {Object} entity - The entity object (board or workspace)
   * @param {String} email - The email address of the invitation to cancel
   * @returns {Boolean} - True if invitation was found and cancelled
   */
  cancelInvitation(entity, email) {
    if (!entity.invitations || !Array.isArray(entity.invitations)) {
      return false;
    }

    const initialCount = entity.invitations.length;
    entity.invitations = entity.invitations.filter(
      (inv) => inv.email !== email
    );

    return initialCount > entity.invitations.length;
  },

  /**
   * Accept an invitation and add the user to the entity
   * @param {Object} entity - The entity object (board or workspace)
   * @param {Object} invitation - The verified invitation
   * @param {Object} user - The user accepting the invitation
   * @param {Object} options - Additional options specific to entity type
   * @returns {Object} - The updated entity
   */
  async acceptInvitation(entity, invitation, user, options = {}) {
    if (!entity || !invitation || !user) {
      throw new Error('Missing required parameters');
    }

    // Check if user is already a member
    const isAlreadyMember = entity.members.some(
      (member) => member.user.toString() === user._id.toString()
    );

    if (!isAlreadyMember) {
      // Get default permissions based on role
      let permissions;

      if (invitation.role === 'admin') {
        if (options.entityType === 'workspace') {
          permissions = [
            'manage_members',
            'create_boards',
            'delete_own_boards',
            'invite_members',
            'view_members',
            'manage_settings',
          ];
        } else {
          // board
          permissions = [
            'manage_board',
            'archive_board',
            'manage_members',
            'create_lists',
            'edit_lists',
            'archive_lists',
            'create_cards',
            'edit_cards',
            'move_cards',
            'delete_cards',
            'assign_members',
            'create_labels',
            'comment',
            'view_board',
          ];
        }
      } else {
        // member role
        if (options.entityType === 'workspace') {
          permissions = ['view_workspace', 'view_own_boards', 'view_members'];
        } else {
          // board
          permissions = [
            'view_board',
            'create_cards',
            'edit_own_cards',
            'move_own_cards',
            'comment',
          ];
        }
      }

      // Add user to members with appropriate role and permissions
      entity.members.push({
        user: user._id,
        role: invitation.role,
        permissions,
        joinedAt: new Date(),
        ...(invitation.invitedBy ? { invitedBy: invitation.invitedBy } : {}),
      });
    }

    // Remove the used invitation
    const hashedToken = invitation.token;
    entity.invitations = entity.invitations.filter(
      (inv) => inv.token !== hashedToken
    );

    // Save changes
    await entity.save();

    return entity;
  },
};

module.exports = invitationService;
