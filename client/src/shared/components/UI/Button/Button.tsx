type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  onClick?: () => void;
};

function Button({
  children,
  variant = "primary",
  onClick,
}: ButtonProps) {
  const baseStyles =
    "rounded-lg px-4 py-2 font-medium transition-colors";

  const variants = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700",

    secondary:
      "bg-slate-200 text-slate-800 hover:bg-slate-300",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default Button;