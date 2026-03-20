'use client';

function getStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const COLORS = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];

export default function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const strength = getStrength(password);

  return (
    <div className="flex gap-1 mt-1.5">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
            i <= strength ? COLORS[strength - 1] : 'bg-[#0e393d]/10'
          }`}
        />
      ))}
    </div>
  );
}
