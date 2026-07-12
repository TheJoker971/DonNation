/* eslint-disable @next/next/no-img-element */
interface AssociationAvatarProps {
  name: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-10 w-10 text-base',
  md: 'h-14 w-14 text-xl',
  lg: 'h-16 w-16 text-2xl',
};

export function AssociationAvatar({ name, logoUrl, size = 'md' }: AssociationAvatarProps) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={`${sizeClasses[size]} rounded-2xl object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center rounded-2xl bg-brand-100 font-bold text-brand-700`}
      aria-hidden
    >
      {initials || '?'}
    </div>
  );
}
