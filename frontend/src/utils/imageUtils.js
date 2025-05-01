import Avatar from "../assets/defaultAvatar.png";

export const isValidImageUrl = (url) => {
  return url && (url.startsWith('http') || url.startsWith('/'));
};

export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath) return '/defaultAvatar.png';
  if (avatarPath.startsWith('http')) return avatarPath;
  if (avatarPath.startsWith('/uploads/')) return avatarPath;
  return `/uploads/users/${avatarPath}`;
};
