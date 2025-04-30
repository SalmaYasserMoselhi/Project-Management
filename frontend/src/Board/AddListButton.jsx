// const AddListButton = () => (
//     <div
//       className="min-w-[260px] h-[47px] flex items-center justify-center bg-white rounded-lg cursor-pointer  transition mt-2"
//     //   onClick={onClick}
//     >
//       <span className="text-purple-600 font-medium">＋ Add list</span>
//     </div>
//   );

//   export default AddListButton;


import { Plus } from "lucide-react";
import { PlusCircle } from "lucide-react";
import { CirclePlus } from "lucide-react";

const AddListButton = () => (
  <div
    className="min-w-[260px] h-[47px] flex items-center font-[Nunito]  bg-white rounded-lg cursor-pointer transition mt-2"
    // onClick={onClick}
  >
    <Plus className="text-[#4D2D61] w-5 h-5 mr-2 ml-5 text-md" />
   
    <span className=" font-bold text-black ">Add list</span>
  </div>
);

export default AddListButton;