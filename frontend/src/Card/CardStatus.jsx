import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { updateListId } from "../features/Slice/cardSlice/cardDetailsSlice";

export default function CardStatus({ boardId, lists = [], currentListId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [boardLists, setBoardLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const dropdownRef = useRef(null);
  const dispatch = useDispatch();
  const BASE_URL = "http://localhost:3000";

  // get the card information from Redux
  const { listId, id: cardId } = useSelector((state) => state.cardDetails);

  // use the passed lists or fetch them from the API
  useEffect(() => {
    console.log("CardStatus - Current List ID:", currentListId);
    console.log("CardStatus - Lists available:", lists);

    // if the lists are passed, use them
    if (lists && lists.length > 0) {
      setBoardLists(lists);

      // select the list from Redux or props
      const currentId = listId || currentListId;
      console.log("CardStatus - Using list ID:", currentId);

      if (currentId) {
        const current = lists.find((list) => list.id === currentId);
        if (current) {
          setSelectedList(current);
          // update the list value in Redux
          dispatch(updateListId(current.id));
          console.log("CardStatus - Selected list:", current.name, current.id);
        } else if (lists.length > 0) {
          // if no list is selected, use the first one
          setSelectedList(lists[0]);
          dispatch(updateListId(lists[0].id));
          console.log(
            "CardStatus - Fallback to first list:",
            lists[0].name,
            lists[0].id
          );
        }
      } else if (lists.length > 0) {
        // if no list is selected, use the first one
        setSelectedList(lists[0]);
        dispatch(updateListId(lists[0].id));
        console.log(
          "CardStatus - No list selected, using first list:",
          lists[0].name,
          lists[0].id
        );
      }
      return;
    }

    // if the lists are not passed, fetch them from the API
    const fetchLists = async () => {
      if (!boardId) return;

      try {
        const res = await axios.get(
          `${BASE_URL}/api/v1/lists/board/${boardId}/lists`
        );
        if (res.data && res.data.data && res.data.data.lists) {
          const fetchedLists = res.data.data.lists;
          setBoardLists(fetchedLists);

          // select the list
          const currentId = listId || currentListId;
          console.log("CardStatus - Using list ID:", currentId);

          if (currentId) {
            const current = fetchedLists.find((list) => list.id === currentId);
            if (current) {
              setSelectedList(current);
              dispatch(updateListId(current.id));
              console.log(
                "CardStatus - Selected list:",
                current.name,
                current.id
              );
            } else if (fetchedLists.length > 0) {
              setSelectedList(fetchedLists[0]);
              dispatch(updateListId(fetchedLists[0].id));
              console.log(
                "CardStatus - Fallback to first list:",
                fetchedLists[0].name,
                fetchedLists[0].id
              );
            }
          } else if (fetchedLists.length > 0) {
            setSelectedList(fetchedLists[0]);
            dispatch(updateListId(fetchedLists[0].id));
            console.log(
              "CardStatus - No list selected, using first list:",
              fetchedLists[0].name,
              fetchedLists[0].id
            );
          }
        }
      } catch (error) {
        console.error("Error fetching lists:", error);
        toast.error("Could not load lists");
      }
    };

    fetchLists();
  }, [boardId, lists, currentListId, listId, dispatch]);

  // close the dropdown when clicking outside it
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // update the selected list in Redux only, without sending the changes to the server
  const handleListChange = (list) => {
    setSelectedList(list);

    // update Redux only
    dispatch(updateListId(list.id));
    setIsOpen(false);
  };

  return (
    <div className="flex flex-row items-center mt-4 w-full">
      <div className="w-30 text-gray-500 flex items-center">
        <svg
          className="w-5 h-5 mr-2"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <g strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="1" />
          </g>
        </svg>
        Status
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          className="px-3 py-1 rounded-md text-sm font-medium flex items-center gap-2"
          style={{
            backgroundColor: "#4D2D6120",
            color: "#4D2D61",
          }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedList ? selectedList.name : "Select a list"}
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* dropdown */}
        {isOpen && (
          <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-50">
            {boardLists.map((list) => (
              <div
                key={list.id}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center gap-2 ${
                  selectedList && selectedList.id === list.id
                    ? "bg-gray-100"
                    : ""
                }`}
                onClick={() => handleListChange(list)}
              >
                <span style={{ color: "#4D2D61" }}>{list.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
