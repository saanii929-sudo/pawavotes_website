import Award from '@/models/Award';

/**
 * Check if a user has access to a specific award
 * @param userId - User ID
 * @param userRole - User role ('organization' or 'org-admin')
 * @param awardId - Award ID to check access for
 * @param assignedAwards - Array of award IDs assigned to org-admin (optional)
 * @returns boolean - true if user has access, false otherwise
 */
export async function hasAwardAccess(
  userId: string,
  userRole: string,
  awardId: string,
  assignedAwards?: string[]
): Promise<boolean> {
  try {
    // Organization owners have access to all their awards
    if (userRole === 'organization') {
      const award = await Award.findOne({
        _id: awardId,
        organizationId: userId,
      });
      console.log('hasAwardAccess check for organization:', {
        userId,
        awardId,
        foundAward: !!award,
        awardOrgId: award?.organizationId,
      });
      return !!award;
    }

    // Org-admins only have access to assigned awards
    if (userRole === 'org-admin') {
      if (!assignedAwards || assignedAwards.length === 0) {
        return false;
      }
      return assignedAwards.includes(awardId);
    }

    return false;
  } catch (error) {
    console.error('Error checking award access:', error);
    return false;
  }
}

/**
 * Get query filter for awards based on user role
 * @param userId - User ID
 * @param userRole - User role ('organization' or 'org-admin')
 * @param assignedAwards - Array of award IDs assigned to org-admin (optional)
 * @returns MongoDB query object
 */
export function getAwardAccessQuery(
  userId: string,
  userRole: string,
  assignedAwards?: string[]
): any {
  if (userRole === 'organization') {
    return { organizationId: userId };
  }

  if (userRole === 'org-admin') {
    if (!assignedAwards || assignedAwards.length === 0) {
      return { _id: { $in: [] } }; // Return empty result
    }
    return { _id: { $in: assignedAwards } };
  }

  return { _id: { $in: [] } }; // Return empty result for unknown roles
}
