const crypto = require('crypto');
const sendEmail = require('../utils/email');
const notificationService = require('./notificationService');
const User = require('../models/userModel');

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
     <body style="background-color: #f6f9fc; margin: 0; padding: 20px; font-family: Arial, Helvetica, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td align="center" valign="top">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); max-width: 600px;">
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding: 30px 20px 20px 20px;">
                <img src="cid:nexus_logo" alt="Nexus Logo" width="160" style="display: block;">
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 30px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="border-left: 4px solid #4d2d61; padding-left: 15px;">
                    <h2 style="color: #4d2d61; font-size: 22px; margin-top: 0; margin-bottom: 15px; font-weight: normal; font-family: Arial, Helvetica, sans-serif;">${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Invitation</h2>
                    <p style="color: #333333; font-size: 16px; line-height: 24px; margin-top: 0; margin-bottom: 10px;">You've been invited to join <strong>"${entityName}"</strong> ${entityType}.</p>
                    <p style="color: #555555; font-size: 15px; line-height: 22px; margin-top: 0; margin-bottom: 0;">Your designated role will be: <span style="color: #4d2d61; font-weight: bold;">${role}</span></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Button -->
          <tr>
            <td align="center" style="padding: 30px 30px 20px 30px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="background-color: #4d2d61; border-radius: 6px;">
                    <a href="${inviteUrl}" style="display: inline-block; padding: 12px 30px; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; font-family: Arial, Helvetica, sans-serif;">Accept Invitation</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Additional info -->
          <tr>
            <td align="center" style="padding: 10px 30px 30px 30px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f5fa; border-radius: 6px;">
                <tr>
                  <td align="center" style="padding: 15px;">
                    <p style="color: #4d2d61; font-size: 14px; line-height: 20px; margin: 0; font-family: Arial, Helvetica, sans-serif; text-align: center;">
                      ${entityType === 'board' ? "Once accepted, you'll find this board in your collaboration workspace." : ''}
                      <br>This invitation expires in <strong>7 days</strong>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px 30px 30px; border-top: 1px solid #e6e6e6;">
              <p style="color: #888888; font-size: 13px; line-height: 18px; margin-top: 0; margin-bottom: 15px; text-align: center; font-family: Arial, Helvetica, sans-serif;">If you didn't expect this invitation, you can safely ignore this email.</p>
              <div style="text-align: center;">
              <img src="cid:nexus_logo" alt="Nexus Logo" width="160" style="display: block;">
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
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
   * @param {Object} io - Socket.io instance (optional, for notifications)
   * @returns {Object} - Results of invitation process
   */
  async processBulkInvitations(
    entity,
    invites,
    invitedBy,
    entityType,
    baseUrl,
    io = global.io // Use global.io if not explicitly provided
  ) {
    if (!Array.isArray(invites)) {
      throw new Error('Invites must be an array');
    }

    const results = [];
    console.log(`Processing ${invites.length} invitations for ${entityType} ${entity.name}`);

    for (const invite of invites) {
      const { email, role = 'member' } = invite;

      try {
        console.log(`Processing invitation for ${email} with role ${role}`);
        
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

        console.log(`Email sent to ${email} for ${entityType} invitation`);

        // Send notification if user already exists in the system
        const invitedUser = await User.findOne({ email }).select('_id');
        if (invitedUser) {
          console.log(`User found with email ${email}, sending notification`);
          
          // Create notification based on entity type
          const notificationType = 
            entityType === 'board' ? 'board_invitation' : 'workspace_invitation';
          
          // Get inviter details for the notification
          const inviter = await User.findById(invitedBy).select('firstName lastName username avatar');
          

          if (io) {
            await notificationService.createNotification(
              io,
              invitedUser._id,
              invitedBy,
              notificationType,
              entityType,
              entity._id,
              {
                [`${entityType}Name`]: entity.name,
                role,
                inviteToken,
                inviterName: inviter ? 
                (inviter.firstName && inviter.lastName) ? 
                  `${inviter.firstName} ${inviter.lastName}` : 
                  inviter.username : 
                'A user'
              }
            );
            console.log(`Notification sent to user ${invitedUser._id} for ${notificationType}`);
          } else {
            console.log('Socket IO instance not available, notification not sent');
          }
        } else {
          console.log(`No existing user found with email ${email}, skipping notification`);
        }

        // Record successful invitation
        results.push({ email, role, status: 'sent' , inviteToken });
      } catch (error) {
        console.error(`Error processing invitation for ${email}:`, error);
        
        // Remove the failed invitation from entity
        entity.invitations = entity.invitations.filter(
          (inv) =>
            !(
              inv.email === email &&
              inv.invitedBy.toString() === invitedBy.toString() &&
              inv.status === 'pending'
            )
        );
        
        // Add failed invitation to results
        results.push({ 
          email, 
          role, 
          status: 'failed',
          error: error.message 
        });
      }
    }

    console.log(`Processed ${results.length} invitations with ${results.filter(r => r.status === 'sent').length} successful`);
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
   * @param {Object} io - Socket.io instance (optional, for notifications)
   * @returns {Object} - The updated entity
   */
  async acceptInvitation(entity, invitation, user, options = {}, io = global.io) {
    if (!entity || !invitation || !user) {
      throw new Error('Missing required parameters');
    }

    const entityType = options.entityType || 'entity';
    console.log(`User ${user._id} accepting invitation to ${entityType} ${entity.name}`);

    // Check if user is already a member
    const isAlreadyMember = entity.members.some(
      (member) => member.user.toString() === user._id.toString()
    );

    if (!isAlreadyMember) {
      console.log(`Adding user ${user._id} as new member with role ${invitation.role}`);
      
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
      
      // Create notification for other members of the entity about new member joining
      if (io) {
        console.log(`Preparing notifications for existing members about new member ${user._id}`);
        
        // Get the inviter
        const inviter = await User.findById(invitation.invitedBy);
        
        // Notify all existing members (except the inviter and the new member)
        const existingMembers = entity.members
          .filter(member => 
            member.user.toString() !== user._id.toString() && 
            member.user.toString() !== invitation.invitedBy.toString()
          )
          .map(member => member.user);
          
        console.log(`Sending notifications to ${existingMembers.length} existing members`);
        
        for (const memberId of existingMembers) {
          await notificationService.createNotification(
            io,
            memberId,
            invitation.invitedBy,
            'member_added',
            options.entityType,
            entity._id,
            {
              entityType: options.entityType,
              entityName: entity.name,
              newMemberName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username,
              role: invitation.role,
            }

            
          );
          console.log(`Notification sent to member ${memberId} about new member joining`);
        }

         // Send welcome notification to the new member
         await notificationService.createNotification(
          io,
          user._id,
          invitation.invitedBy,
          `${entityType}_welcome`,
          entityType,
          entity._id,
          {
            [`${entityType}Name`]: entity.name,
            role: invitation.role,
            inviterName: inviter ? 
              (inviter.firstName && inviter.lastName) ? 
                `${inviter.firstName} ${inviter.lastName}` : 
                inviter.username : 
              'A user'
          }
        );
        console.log(`Welcome notification sent to new member ${user._id}`);
      } else {
        console.log('Socket IO instance not available, notifications not sent to existing members');
      }
    } else {
      console.log(`User ${user._id} is already a member of ${options.entityType} ${entity.name}`);
    }

    // Remove the used invitation
    const hashedToken = invitation.token;
    entity.invitations = entity.invitations.filter(
      (inv) => inv.token !== hashedToken
    );

    console.log(`Removed used invitation token for user ${user._id}`);

    // Save changes
    await entity.save();
    console.log(`Saved ${options.entityType} ${entity._id} with updated members and invitations`);

    return entity;
  },
};

module.exports = invitationService;