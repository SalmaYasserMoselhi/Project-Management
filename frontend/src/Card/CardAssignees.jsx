import { useState } from "react";

export default function CardAssignees() {
  const assignees = [
    { id: 1, name: "Alice", avatar: "https://i.pravatar.cc/40?img=1" },
    { id: 2, name: "Bob", avatar: "https://i.pravatar.cc/40?img=2" },
    { id: 3, name: "Charlie", avatar: "https://i.pravatar.cc/40?img=3" },
  ];

  return (
    <div className="flex flex-row items-center mt-4 w-full max-[320px]:flex-col max-[320px]:items-start">
      {/* عنوان */}
      <div className="w-30 text-gray-500 flex items-center">
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M3.5 8a5.5 5.5 0 1 1 8.596 4.547a9.005 9.005 0 0 1 5.9 8.18a.751.751 0 0 1-1.5.045a7.5 7.5 0 0 0-14.993 0a.75.75 0 0 1-1.499-.044a9.005 9.005 0 0 1 5.9-8.181A5.5 5.5 0 0 1 3.5 8M9 4a4 4 0 1 0 0 8a4 4 0 0 0 0-8m8.29 4q-.221 0-.434.03a.75.75 0 1 1-.212-1.484a4.53 4.53 0 0 1 3.38 8.097a6.69 6.69 0 0 1 3.956 6.107a.75.75 0 0 1-1.5 0a5.19 5.19 0 0 0-3.696-4.972l-.534-.16v-1.676l.41-.209A3.03 3.03 0 0 0 17.29 8"
          />
        </svg>
        Assignee
      </div>

      {/* الصور وزر الإضافة */}
      <div className="flex items-center gap-3 max-[320px]:ml-4 max-[320px]:mt-2 max-[320px]:w-full">
        {/* الصور المتداخلة */}
        <div className="flex -space-x-3">
          {assignees.map((user) => (
            <img
              key={user.id}
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full border-2 border-white shadow-md"
            />
          ))}
        </div>

        {/* زر الإضافة */}
        <button className="w-7 h-7 flex items-center justify-center rounded-full text-lg font-bold text-[#4D2D61] bg-[#DCCDE6] transition-all cursor-pointer">
          <svg width="20" height="20" viewBox="0 0 22 22">
            <path fill="currentColor" d="M12 17h-2v-5H5v-2h5V5h2v5h5v2h-5Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
