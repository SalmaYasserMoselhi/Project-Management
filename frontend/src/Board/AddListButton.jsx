import { Plus } from "lucide-react";
import { useState } from "react";
import AddList from "./AddList";

const AddListButton = ({ boardId, onListAdded }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="min-w-[260px] h-[47px] flex items-center justify-center bg-white rounded-lg shadow-sm cursor-pointer transition button-hover"
        onClick={() => setOpen(true)}
      >
        <Plus className="w-5 h-5 font-extrabold bg-[#57356add] rounded-full p-0.5 text-white hover:bg-[#57356a] " />
      </div>

      {open && (
        <AddList
          boardId={boardId}
          onClose={() => setOpen(false)}
          onSuccess={onListAdded}
        />
      )}
    </>
  );
};

export default AddListButton;
