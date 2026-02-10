import React from "react";

// ================== Card Components ==================

export const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white shadow-md rounded-lg border border-gray-200 ${className}`}
  >
    {children}
  </div>
);

export const CardHeader = ({ children }) => (
  <div className="px-6 py-4 border-b border-gray-200">{children}</div>
);

export const CardTitle = ({ children, className = "" }) => (
  <div className={`text-lg font-semibold text-gray-900 ${className}`}>
    <h3>{children}</h3>
  </div>
);

export const CardContent = ({ children, className = "" }) => (
  <div className={`px-6 py-4 ${className}`}>{children}</div>
);

// ================== Form Components ==================

export const Input = React.forwardRef(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black ${className}`}
    {...props}
  />
));

export const Button = ({
  children,
  onClick,
  className = "",
  variant = "primary",
  size = "md",
  disabled = false,
  ...props
}) => {
  const baseClasses =
    "font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    outline:
      "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500",
    destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
  };
  const sizes = {
    sm: "px-2 py-1 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Label = ({ children, className = "" }) => (
  <label
    className={`block text-sm font-medium text-gray-700 mb-1 ${className}`}
  >
    {children}
  </label>
);

export const Textarea = ({ className = "", ...props }) => (
  <textarea
    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black ${className}`}
    {...props}
  />
);

// ================== Tab Components ==================

export const Tabs = ({ children, value, onValueChange }) => (
  <div className="w-full">
    {React.Children.map(
      children,
      (child) =>
        child &&
        React.cloneElement(child, {
          activeTab: value,
          onTabChange: onValueChange,
        }),
    )}
  </div>
);

export const TabsList = ({ children, activeTab, onTabChange }) => (
  <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-4">
    {React.Children.map(
      children,
      (child, index) =>
        child &&
        React.cloneElement(child, {
          isActive: child.props.value === activeTab,
          onClick: () => onTabChange && onTabChange(child.props.value),
        }),
    )}
  </div>
);

export const TabsTrigger = ({
  children,
  value,
  isActive,
  onClick,
  className = "",
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      isActive
        ? "bg-white text-blue-600 shadow-sm"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
    } ${className}`}
  >
    {children}
  </button>
);

export const TabsContent = ({ children, value, activeTab }) =>
  activeTab === value ? <div>{children}</div> : null;

// ================== Loader ==================

export const Loader2 = ({ size = 16, className = "" }) => (
  <span
    className={`inline-block animate-spin ${className}`}
    style={{ fontSize: size }}
  >
    ↻
  </span>
);
