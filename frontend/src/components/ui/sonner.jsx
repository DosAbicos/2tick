import { Toaster as Sonner, toast } from "sonner"

const Toaster = ({
  ...props
}) => {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      closeButton={true}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-900 group-[.toaster]:border group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-gray-500",
          actionButton:
            "group-[.toast]:bg-blue-500 group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-700",
          closeButton:
            "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-500 group-[.toast]:border-gray-200 group-[.toast]:hover:bg-gray-200",
          success:
            "group-[.toaster]:bg-white group-[.toaster]:text-gray-900 group-[.toaster]:border-green-200",
          error:
            "group-[.toaster]:bg-white group-[.toaster]:text-gray-900 group-[.toaster]:border-red-200",
        },
        duration: 4000,
      }}
      {...props} />
  );
}

export { Toaster, toast }
