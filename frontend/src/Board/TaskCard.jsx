import drag from "../assets/drag-icon.png";
import vector from "../assets/Vector.png";
import avatar3 from "../assets/Avatar3.png";
import addButton from "../assets/Add Button.png";
import List from "../assets/prime_list.png";
import File from "../assets/file_present.png";
import third from "../assets/third.png";

const TaskCard = ({ priority, fileCount = 3, commentCount = 5 }) => {
  const priorityStyles = {
    Low: "bg-[#FEE2E2] text-[#DC2626]",
    Medium: "bg-[#EDE9FE] text-[#7C3AED]",
    High: "bg-[#DCFCE7] text-[#16A34A]",
  };

  return (
    <div className="flex rounded-lg overflow-hidden shadow-lg mb-3 w-full">
      <div
        className="w-10 bg-[#4D2D61] flex items-center justify-center"
        style={{ minHeight: "100px" }}
      >
        <img src={drag} className="w-5 h-8 text-white" alt="Icon" />
      </div>

      <div className="bg-white text-black p-3 rounded-r-lg flex-grow w-full">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold mt-1 mb-3">Model Answer</h4>
          <img
            src={vector}
            className="w-[18px] h-[4px] cursor-pointer hover:opacity-70"
            alt="Right Icon"
          />
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 text-xs font-sm rounded-full font-bold ${priorityStyles[priority]}`}
          >
            {priority}
          </span>
          <span className="px-2 py-1 text-xs font-sm rounded-full bg-[#FEE2E2] text-[#DC2626] font-bold">
            UI
          </span>
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="flex -space-x-2">
            <img
              src={avatar3}
              className="w-8 h-8 rounded-full border-2 border-white"
              alt="avatar"
            />
            <span className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full border-2 border-white text-sm font-bold text-[#606C80]">
              +5
            </span>
            <img
              src={addButton}
              alt="Add"
              className="w-8 h-8 ms-4 rounded-full border-2 border-white bg-gray-300 cursor-pointer"
            />
          </div>

          <div className="flex gap-2 ml-4 items-center">
            <img
              src={List}
              className="w-6 h-6 cursor-pointer hover:opacity-70"
              alt="Checklist"
            />
            <div className="flex items-center gap-0">
              <img
                src={File}
                className="w-5 h-5 cursor-pointer hover:opacity-70"
                alt="Files"
              />
              <span className="text-sm text-gray-600 font-bold mt-1">
                {fileCount}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <img
                src={third}
                className="w-5 h-5 cursor-pointer hover:opacity-70 mt-1"
                alt="Comments"
              />
              <span className="text-sm text-gray-600 font-bold mt-1">
                {commentCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
