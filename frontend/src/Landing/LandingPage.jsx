import React, { useState, useEffect, useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { useNavigate } from "react-router-dom";
import { TypeAnimation } from "react-type-animation";
import {
  ArrowRight,
  Check,
  Calendar,
  MessageSquare,
  LayoutGrid,
  Plus,
  X,
  Clock,
  Link as LinkIcon,
  Users,
  ChevronLeft,
  ChevronRight,
  GripHorizontal,
  Smile,
  Paperclip,
  Send,
} from "lucide-react";
import logoImage from "../assets/coloredLogoWithWordBeside.png";
import { format } from "date-fns";

// Board Preview Component for Landing Page
const BoardPreviewComponent = () => {
  const [columns, setColumns] = useState([
    {
      id: "col-1",
      name: "To Do",
      cards: [
        {
          id: "card-1",
          title: "Research competitors",
          labels: ["Research", "Marketing"],
        },
        { id: "card-2", title: "Create wireframes", labels: ["Design"] },
        {
          id: "card-3",
          title: "Update documentation",
          labels: ["Documentation"],
        },
      ],
    },
    {
      id: "col-2",
      name: "In Progress",
      cards: [
        {
          id: "card-4",
          title: "Implement login page",
          labels: ["Development", "Frontend"],
        },
        { id: "card-5", title: "Design system updates", labels: ["Design"] },
      ],
    },
    {
      id: "col-3",
      name: "Done",
      cards: [
        { id: "card-6", title: "Setup project repository", labels: ["DevOps"] },
        { id: "card-7", title: "Create project plan", labels: ["Planning"] },
      ],
    },
  ]);

  const [draggingCard, setDraggingCard] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [dropPosition, setDropPosition] = useState(null);

  // Handle card drag start
  const handleDragStart = (card, columnId) => {
    setDraggingCard({ ...card, sourceColumnId: columnId });
    setIsDragging(true);
  };

  // Handle card drag end
  const handleDragEnd = () => {
    if (
      draggingCard &&
      dragOverColumn &&
      draggingCard.sourceColumnId !== dragOverColumn
    ) {
      const updatedColumns = columns.map((col) => {
        // Remove card from source column
        if (col.id === draggingCard.sourceColumnId) {
          return {
            ...col,
            cards: col.cards.filter((c) => c.id !== draggingCard.id),
          };
        }
        // Add card to target column
        if (col.id === dragOverColumn) {
          return {
            ...col,
            cards: [
              ...col.cards,
              {
                id: draggingCard.id,
                title: draggingCard.title,
                labels: draggingCard.labels,
              },
            ],
          };
        }
        return col;
      });

      setColumns(updatedColumns);
    }

    setDraggingCard(null);
    setIsDragging(false);
    setDragOverColumn(null);
    setDropPosition(null);
  };

  // Handle drag over column
  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }

    const columnElement = e.currentTarget;
    const cardElements = columnElement.querySelectorAll(".task-card");
    const mouseY = e.clientY;

    let newPosition = cardElements.length;

    if (cardElements.length > 0) {
      for (let i = 0; i < cardElements.length; i++) {
        const rect = cardElements[i].getBoundingClientRect();
        if (mouseY < rect.top + rect.height / 2) {
          newPosition = i;
          break;
        } else if (mouseY < rect.bottom) {
          newPosition = i + 1;
          break;
        }
      }
    }

    setDropPosition(newPosition);
  };

  // Handle drag enter
  const handleDragEnter = (e) => {
    e.preventDefault();
  };

  // Handle drag leave
  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropPosition(null);
    }
  };

  // Get label color based on label name
  const getLabelColor = (label) => {
    const colors = {
      Research: "#8B5CF6",
      Marketing: "#EC4899",
      Design: "#3B82F6",
      Documentation: "#10B981",
      Development: "#F59E0B",
      Frontend: "#6366F1",
      DevOps: "#EF4444",
      Planning: "#14B8A6",
    };

    return colors[label] || "#4d2d61";
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-4 pb-4 pt-2 px-2">
        {columns.map((column) => (
          <motion.div
            key={column.id}
            className="p-2 rounded-lg flex-1 flex flex-col min-w-[280px] bg-gray-50"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDragEnd}
          >
            <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-lg shadow-sm">
              <div className="flex items-center w-[190px]">
                <h3 className="text-black font-semibold me-2">
                  {column.name}
                  <span
                    className="px-2 py-1 rounded-full text-sm ms-2"
                    style={{ backgroundColor: "#A855F71A" }}
                  >
                    {column.cards.length}
                  </span>
                </h3>
              </div>
              <div className="flex items-center">
                <button className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="flex-grow flex flex-col">
              <div
                className="cards-container overflow-y-visible"
                style={{ paddingRight: "6px" }}
              >
                <div style={{ paddingLeft: "4px" }}>
                  {column.cards.map((card, index) => (
                    <React.Fragment key={card.id}>
                      {dropPosition === index &&
                        dragOverColumn === column.id && (
                          <div className="h-3 bg-gray-300 rounded my-1"></div>
                        )}
                      <motion.div
                        className="task-card bg-white rounded-md shadow-sm p-3 cursor-grab mb-2"
                        draggable
                        onDragStart={() => handleDragStart(card, column.id)}
                        onDragEnd={handleDragEnd}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          opacity:
                            isDragging && draggingCard?.id === card.id
                              ? 0.5
                              : 1,
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex space-x-1">
                            {card.labels.map((label, idx) => (
                              <div
                                key={idx}
                                className="h-2 w-16 rounded-full"
                                style={{
                                  backgroundColor: getLabelColor(label),
                                }}
                              />
                            ))}
                          </div>
                          <div className="flex items-center">
                            <button className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center">
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M8 8.66667C8.36819 8.66667 8.66667 8.36819 8.66667 8C8.66667 7.63181 8.36819 7.33333 8 7.33333C7.63181 7.33333 7.33333 7.63181 7.33333 8C7.33333 8.36819 7.63181 8.66667 8 8.66667Z"
                                  fill="#6B7280"
                                  stroke="#6B7280"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M8 4C8.36819 4 8.66667 3.70152 8.66667 3.33333C8.66667 2.96514 8.36819 2.66667 8 2.66667C7.63181 2.66667 7.33333 2.96514 7.33333 3.33333C7.33333 3.70152 7.63181 4 8 4Z"
                                  fill="#6B7280"
                                  stroke="#6B7280"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M8 13.3333C8.36819 13.3333 8.66667 13.0349 8.66667 12.6667C8.66667 12.2985 8.36819 12 8 12C7.63181 12 7.33333 12.2985 7.33333 12.6667C7.33333 13.0349 7.63181 13.3333 8 13.3333Z"
                                  fill="#6B7280"
                                  stroke="#6B7280"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">{card.title}</p>
                      </motion.div>
                    </React.Fragment>
                  ))}
                  {dropPosition === column.cards.length &&
                    dragOverColumn === column.id && (
                      <div className="h-3 bg-gray-300 rounded my-1"></div>
                    )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Chat Demo Component for Landing Page
const ChatDemoComponent = () => {
  const [messages, setMessages] = useState([
    {
      _id: "msg1",
      content: "Hey there! How's the project coming along?",
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      sender: { _id: "user1", fullName: "Alex Johnson" },
      isSender: false,
    },
    {
      _id: "msg2",
      content: "It's going well! Just finished the initial wireframes.",
      createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
      sender: { _id: "currentUser", fullName: "You" },
      isSender: true,
    },
    {
      _id: "msg3",
      content: "Great! Can you share them with the team?",
      createdAt: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
      sender: { _id: "user1", fullName: "Alex Johnson" },
      isSender: false,
    },
  ]);

  const [isTyping, setIsTyping] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  // Simulate typing indicator
  useEffect(() => {
    const typingTimeout = setTimeout(() => {
      setIsTyping(true);

      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            _id: "msg4",
            content: "I've also added some notes about the user flow.",
            createdAt: new Date().toISOString(),
            sender: { _id: "user1", fullName: "Alex Johnson" },
            isSender: false,
          },
        ]);
      }, 3000);
    }, 5000);

    return () => clearTimeout(typingTimeout);
  }, []);

  // Handle sending a new message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        _id: `msg-${Date.now()}`,
        content: newMessage,
        createdAt: new Date().toISOString(),
        sender: { _id: "currentUser", fullName: "You" },
        isSender: true,
      },
    ]);

    setNewMessage("");
  };

  // Render message bubble
  const MessageBubble = ({ message }) => {
    const isSender = message.sender._id === "currentUser";

    return (
      <div
        className={`flex mb-4 ${isSender ? "justify-end" : "justify-start"}`}
      >
        {!isSender && (
          <div className="w-[40px] h-[40px] rounded-full bg-gray-200 flex-shrink-0 mr-3 overflow-hidden">
            <img
              src="https://randomuser.me/api/portraits/men/32.jpg"
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div
          className={`max-w-[70%] rounded-2xl px-4 py-3 ${
            isSender
              ? "bg-gradient-to-r from-[#4d2d61] to-[#725483] text-white"
              : "bg-white/90 backdrop-blur-sm text-gray-600 shadow-sm border border-gray-200/50"
          }`}
        >
          <div className="text-base leading-[1.5]">{message.content}</div>
        </div>
        {isSender && (
          <div className="w-[40px] h-[40px] rounded-full bg-gray-200 flex-shrink-0 ml-3 overflow-hidden">
            <img
              src="https://randomuser.me/api/portraits/women/44.jpg"
              alt="Your Avatar"
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-[400px] flex flex-col bg-gray-50 rounded-lg overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center p-4 bg-white border-b border-gray-200">
        <div className="w-[40px] h-[40px] rounded-full bg-gray-200 flex-shrink-0 mr-3 overflow-hidden">
          <img
            src="https://randomuser.me/api/portraits/men/32.jpg"
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h3 className="font-semibold text-[#4d2d61]">Alex Johnson</h3>
          <div className="flex items-center text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
            <span>Online</span>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#F5F5F5]">
        <div className="flex flex-col justify-end min-h-full">
          <div className="space-y-1">
            {messages.map((message) => (
              <div
                key={message._id}
                className="animate-fadeIn"
                style={{
                  animationDelay: "50ms",
                  animationFillMode: "both",
                }}
              >
                <MessageBubble message={message} />
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3 mb-4 animate-fadeIn">
                <div className="w-[40px] flex-shrink-0">
                  <img
                    src="https://randomuser.me/api/portraits/men/32.jpg"
                    alt="typing"
                    className="w-[40px] h-[40px] rounded-full ring-2 ring-gray-200"
                  />
                </div>
                <div className="bg-white/90 backdrop-blur-sm px-4 py-3 rounded-2xl text-gray-600 shadow-sm border border-gray-200/50">
                  <div className="flex items-center gap-1">
                    <span className="text-sm">Typing</span>
                    <div className="flex gap-1">
                      <div
                        className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Chat Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex items-center">
          <button
            type="button"
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
          >
            <Smile className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 mx-2 py-2 px-4 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-[#4d2d61]/30"
          />
          <button
            type="submit"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[#4d2d61] text-white"
            disabled={!newMessage.trim()}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#f9f5ff] overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 py-3 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="bg-white rounded-full shadow-sm border border-gray-100 px-6 py-3 flex justify-between items-center">
            <div className="flex-shrink-0">
              <img src={logoImage} alt="Nexus Logo" className="h-10" />
            </div>

            <div className="flex-grow flex justify-center">
              <div className="hidden md:flex items-center space-x-8">
                <a
                  href="#features"
                  className="text-gray-700 hover:text-[#4d2d61] font-medium text-lg transition-colors"
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  className="text-gray-700 hover:text-[#4d2d61] font-medium text-lg transition-colors"
                >
                  How It Works
                </a>
                <a
                  href="#about-us"
                  className="text-gray-700 hover:text-[#4d2d61] font-medium text-lg transition-colors"
                >
                  About Us
                </a>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center space-x-3">
              <button
                onClick={() => navigate("/login")}
                className="px-5 py-2 text-[#4d2d61] font-medium border border-gray-200 rounded-full hover:border-[#4d2d61] transition-colors text-sm"
              >
                Log In
              </button>
              <motion.button
                onClick={() => navigate("/signup")}
                className="px-5 py-2 bg-[#4d2d61] text-white font-medium rounded-full shadow-sm text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Sign Up Free
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="pt-32 pb-20 md:pt-40 md:pb-32 relative overflow-hidden"
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 -z-10">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-gradient-to-r from-[#4d2d61]/10 to-[#725483]/10"
              style={{
                width: `${Math.random() * 100 + 50}px`,
                height: `${Math.random() * 100 + 50}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, Math.random() * 30 - 15],
                x: [0, Math.random() * 30 - 15],
              }}
              transition={{
                duration: Math.random() * 5 + 5,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-[#4d2d61] mb-6">
              <TypeAnimation
                sequence={[
                  "Unite Your Team",
                  1000,
                  "Unite Your Team, Amplify Your Success",
                  2000,
                ]}
                wrapper="span"
                speed={50}
                repeat={Infinity}
              />
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Everything your team needs in one place. Combine the power of
              Trello, Slack, and Google Calendar in a single, seamless platform.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <motion.button
                onClick={() => navigate("/signup")}
                className="px-8 py-3 bg-gradient-to-r from-[#4d2d61] to-[#725483] text-white font-medium rounded-lg text-lg shadow-xl shadow-purple-300/30"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Start Your Free Trial
              </motion.button>
              <motion.button
                className="px-8 py-3 bg-white text-[#4d2d61] border border-[#4d2d61]/20 font-medium rounded-lg text-lg shadow-lg"
                whileHover={{ scale: 1.05, backgroundColor: "#f9f5ff" }}
                whileTap={{ scale: 0.95 }}
              >
                See It In Action
              </motion.button>
            </div>
          </motion.div>

          {/* Floating feature cards */}
          <div className="relative h-[500px] md:h-[600px] mt-12">
            {/* Kanban Board Card */}
            <motion.div
              className="absolute top-[20px] left-[50%] transform -translate-x-[180px] w-[280px] md:w-[320px] bg-white/80 backdrop-blur-md rounded-xl shadow-2xl p-4 border border-purple-100 z-10"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#4d2d61]/10 flex items-center justify-center mr-3">
                  <LayoutGrid className="w-5 h-5 text-[#4d2d61]" />
                </div>
                <h3 className="font-semibold text-[#4d2d61]">Kanban Boards</h3>
              </div>
              <div className="bg-gradient-to-r from-[#f9f5ff] to-white rounded-lg p-3">
                <div className="flex gap-2 mb-2">
                  <div className="flex-1 bg-white p-2 rounded shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">To Do</div>
                    <div className="text-xs bg-gray-100 p-1 rounded mb-1">
                      Task 1
                    </div>
                  </div>
                  <div className="flex-1 bg-white p-2 rounded shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">
                      In Progress
                    </div>
                    <div className="text-xs bg-gray-100 p-1 rounded mb-1">
                      Task 2
                    </div>
                  </div>
                  <div className="flex-1 bg-white p-2 rounded shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Done</div>
                    <div className="text-xs bg-gray-100 p-1 rounded mb-1">
                      Task 3
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Team Chat Card */}
            <motion.div
              className="absolute top-[180px] left-[50%] transform -translate-x-[380px] w-[280px] md:w-[320px] bg-white rounded-xl shadow-xl p-4 border border-gray-100 z-10"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.8 }}
            >
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#f9f5ff] flex items-center justify-center mr-3">
                  <MessageSquare className="w-5 h-5 text-[#4d2d61]" />
                </div>
                <h3 className="font-semibold text-[#4d2d61]">Team Chat</h3>
              </div>
              <div className="bg-[#f9f5ff] rounded-lg p-3">
                <div className="flex items-start mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#4d2d61] flex-shrink-0"></div>
                  <div className="ml-2 p-2 bg-white rounded-lg text-sm">
                    Hey team, how's the project going?
                  </div>
                </div>
                <div className="flex items-start justify-end">
                  <div className="mr-2 p-2 bg-white rounded-lg text-sm">
                    Making great progress!
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#725483] flex-shrink-0"></div>
                </div>
              </div>
            </motion.div>

            {/* Calendar Card */}
            <motion.div
              className="absolute top-[180px] left-[50%] transform translate-x-[50px] w-[280px] md:w-[320px] bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-10"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.8 }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-[#f9f5ff] flex items-center justify-center mr-3">
                      <Calendar className="w-5 h-5 text-[#4d2d61]" />
                    </div>
                    <h3 className="font-semibold text-[#4d2d61]">Calendar</h3>
                  </div>
                  <button className="w-6 h-6 rounded-full bg-[#f9f5ff] flex items-center justify-center">
                    <Plus className="w-4 h-4 text-[#4d2d61]" />
                  </button>
                </div>

                <div className="bg-[#f9f5ff] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <button className="text-gray-500 mr-1">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-medium">June 2023</span>
                      <button className="text-gray-500 ml-1">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex bg-white rounded-md text-xs overflow-hidden">
                      <button className="px-2 py-1 bg-[#4d2d61] text-white">
                        Month
                      </button>
                      <button className="px-2 py-1 text-gray-600">Week</button>
                      <button className="px-2 py-1 text-gray-600">Day</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-xs text-center">
                    {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                      <div key={i} className="text-gray-500 py-1">
                        {day}
                      </div>
                    ))}

                    {[
                      [1, 2, 3, 4, 5, 6, 7],
                      [8, 9, 10, 11, 12, 13, 14],
                      [15, 16, 17, 18, 19, 20, 21],
                      [22, 23, 24, 25, 26, 27, 28],
                      [29, 30, 31, "", "", "", ""],
                    ].map((week, weekIndex) => (
                      <React.Fragment key={weekIndex}>
                        {week.map((day, dayIndex) => {
                          const isToday = day === 15;
                          const hasMeeting = [16, 22].includes(day);

                          return (
                            <div
                              key={dayIndex}
                              className={`aspect-square flex flex-col items-center justify-center relative py-1
                                ${
                                  isToday
                                    ? "bg-[#4d2d61] text-white rounded-full"
                                    : ""
                                }
                              `}
                            >
                              {day}
                              {hasMeeting && (
                                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-[#4d2d61]"></div>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Board Feature Highlight Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="w-full lg:w-1/2">
              <motion.div
                className="bg-white rounded-xl shadow-xl overflow-hidden"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div className="p-4 bg-[#4d2d61]/5 border-b border-gray-100">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-[#4d2d61]/10 flex items-center justify-center mr-3">
                      <LayoutGrid className="w-4 h-4 text-[#4d2d61]" />
                    </div>
                    <h3 className="font-semibold text-[#4d2d61]">
                      Project Board
                    </h3>
                  </div>
                </div>
                <BoardPreviewComponent />
              </motion.div>
            </div>
            <div className="w-full lg:w-1/2">
              <motion.h2
                className="text-3xl md:text-4xl font-bold text-[#4d2d61] mb-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                Visual Task Management
              </motion.h2>

              <motion.p
                className="text-lg text-gray-600 mb-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                Organize your team's work with flexible Kanban boards. Drag and
                drop tasks between columns to visualize workflow and track
                progress in real-time.
              </motion.p>

              <div className="space-y-6">
                {[
                  {
                    title: "Customizable Workflows",
                    description:
                      "Create custom columns to match your team's unique process and workflow requirements.",
                    icon: <LayoutGrid className="w-5 h-5 text-white" />,
                  },
                  {
                    title: "Visual Progress Tracking",
                    description:
                      "Instantly see the status of all tasks and identify bottlenecks with a quick glance at your board.",
                    icon: <Check className="w-5 h-5 text-white" />,
                  },
                  {
                    title: "Collaborative Task Management",
                    description:
                      "Assign team members to cards, add comments, and attach files for seamless collaboration.",
                    icon: <Users className="w-5 h-5 text-white" />,
                  },
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#4d2d61] to-[#725483] flex items-center justify-center mr-4 shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-[#4d2d61] mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* Calendar Feature Highlight Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
            <div className="w-full lg:w-1/2">
              <motion.div
                className="bg-white rounded-xl shadow-xl overflow-hidden max-w-lg mx-auto"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                {/* Larger Calendar Demo for Feature Section */}
                <CalendarDemoComponent />
              </motion.div>
            </div>
            <div className="w-full lg:w-1/2">
              <motion.h2
                className="text-3xl md:text-4xl font-bold text-[#4d2d61] mb-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                Seamless Meeting Management
              </motion.h2>

              <motion.p
                className="text-lg text-gray-600 mb-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                Our integrated calendar system makes scheduling and managing
                team meetings effortless. Keep everyone on the same page with a
                centralized meeting hub.
              </motion.p>

              <div className="space-y-6">
                {[
                  {
                    title: "Intuitive Scheduling",
                    description:
                      "Create meetings with just a few clicks. Set times, add participants, and include meeting links all in one place.",
                    icon: <Calendar className="w-5 h-5 text-white" />,
                  },
                  {
                    title: "Multiple Views",
                    description:
                      "Switch between month, week, and day views to get the perspective you need on your schedule.",
                    icon: <LayoutGrid className="w-5 h-5 text-white" />,
                  },
                  {
                    title: "Team Coordination",
                    description:
                      "Invite team members to meetings and keep everyone synchronized with shared calendars.",
                    icon: <Users className="w-5 h-5 text-white" />,
                  },
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#4d2d61] to-[#725483] flex items-center justify-center mr-4 shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-[#4d2d61] mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chat Feature Highlight Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
            <div className="w-full lg:w-1/2">
              <motion.h2
                className="text-3xl md:text-4xl font-bold text-[#4d2d61] mb-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                Seamless Team Communication
              </motion.h2>

              <motion.p
                className="text-lg text-gray-600 mb-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                Connect with your team in real-time through our intuitive
                messaging platform. Share ideas, files, and updates instantly to
                keep everyone in sync.
              </motion.p>

              <div className="space-y-6">
                {[
                  {
                    title: "Real-time Messaging",
                    description:
                      "Communicate instantly with team members through direct and group messages.",
                    icon: <MessageSquare className="w-5 h-5 text-white" />,
                  },
                  {
                    title: "File Sharing",
                    description:
                      "Share documents, images, and other files directly in your conversations.",
                    icon: <Paperclip className="w-5 h-5 text-white" />,
                  },
                  {
                    title: "Group Conversations",
                    description:
                      "Create dedicated channels for teams, projects, or topics to keep discussions organized.",
                    icon: <Users className="w-5 h-5 text-white" />,
                  },
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#4d2d61] to-[#725483] flex items-center justify-center mr-4 shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-[#4d2d61] mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="w-full lg:w-1/2">
              <motion.div
                className="bg-white rounded-xl shadow-xl overflow-hidden"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6 }}
              >
                <div className="p-4 bg-[#4d2d61]/5 border-b border-gray-100">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-[#4d2d61]/10 flex items-center justify-center mr-3">
                      <MessageSquare className="w-4 h-4 text-[#4d2d61]" />
                    </div>
                    <h3 className="font-semibold text-[#4d2d61]">Team Chat</h3>
                  </div>
                </div>
                <ChatDemoComponent />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" ref={featuresRef} className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <motion.h2
              className="text-3xl md:text-4xl font-bold text-[#4d2d61] mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Everything Your Team Needs
            </motion.h2>
            <motion.p
              className="text-xl text-gray-600 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Nexus Community combines the best tools for modern teams in one
              seamless platform
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <LayoutGrid className="w-6 h-6 text-[#4d2d61]" />,
                title: "Kanban Boards",
                description:
                  "Visualize your workflow with customizable boards, lists, and cards.",
              },
              {
                icon: <MessageSquare className="w-6 h-6 text-[#4d2d61]" />,
                title: "Real-time Chat",
                description:
                  "Communicate instantly with your team through direct and group messages.",
              },
              {
                icon: <Calendar className="w-6 h-6 text-[#4d2d61]" />,
                title: "Meeting Scheduler",
                description:
                  "Plan and organize your meetings with an integrated calendar system.",
              },
              {
                icon: <Check className="w-6 h-6 text-[#4d2d61]" />,
                title: "Task Management",
                description:
                  "Assign, track, and complete tasks with powerful management tools.",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="bg-white rounded-xl shadow-lg p-6 border border-purple-100 hover:shadow-xl transition-all duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5, backgroundColor: "#f9f5ff" }}
              >
                <div className="w-14 h-14 rounded-lg bg-[#4d2d61]/10 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-[#4d2d61] mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        className="py-20 bg-gradient-to-b from-white to-[#f9f5ff]"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <motion.h2
              className="text-3xl md:text-4xl font-bold text-[#4d2d61] mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              How It Works
            </motion.h2>
            <motion.p
              className="text-xl text-gray-600 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Get started with Nexus Community in just a few simple steps
            </motion.p>
          </div>

          <div className="max-w-4xl mx-auto">
            {[
              {
                step: "01",
                title: "Create Your Workspace",
                description:
                  "Sign up and create your team workspace in seconds.",
              },
              {
                step: "02",
                title: "Invite Your Team",
                description:
                  "Add team members and assign roles and permissions.",
              },
              {
                step: "03",
                title: "Set Up Your Boards",
                description:
                  "Create boards for projects and customize your workflow.",
              },
              {
                step: "04",
                title: "Start Collaborating",
                description:
                  "Chat, assign tasks, and schedule meetings all in one place.",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                className="flex items-start mb-12 relative"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
              >
                {index < 3 && (
                  <div className="absolute left-10 top-16 w-0.5 h-20 bg-gradient-to-b from-[#4d2d61] to-[#725483]/30"></div>
                )}
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#4d2d61] to-[#725483] flex items-center justify-center text-white font-bold text-xl shrink-0">
                  {item.step}
                </div>
                <div className="ml-6 pt-3">
                  <h3 className="text-2xl font-semibold text-[#4d2d61] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 text-lg">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <motion.h2
              className="text-3xl md:text-4xl font-bold text-[#4d2d61] mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Trusted by Teams Everywhere
            </motion.h2>
            <motion.p
              className="text-xl text-gray-600 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              See what our users are saying about Nexus Community
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                quote:
                  "Nexus Community has transformed how our team collaborates. Everything is in one place now!",
                name: "Sarah Johnson",
                title: "Product Manager",
              },
              {
                quote:
                  "The combination of boards, chat and calendar makes this the ultimate productivity tool for our team.",
                name: "Michael Chen",
                title: "Tech Lead",
              },
              {
                quote:
                  "We've tried many tools, but Nexus Community is the first one our entire team has embraced.",
                name: "Emily Rodriguez",
                title: "Marketing Director",
              },
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                className="bg-white rounded-xl shadow-lg p-6 border border-purple-100"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{
                  y: -5,
                  boxShadow:
                    "0 20px 25px -5px rgba(77, 45, 97, 0.1), 0 10px 10px -5px rgba(77, 45, 97, 0.04)",
                }}
              >
                <div className="mb-4 text-[#4d2d61]">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-[#4d2d61]">
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#4d2d61] to-[#725483]"></div>
                  <div className="ml-3">
                    <h4 className="font-semibold text-[#4d2d61]">
                      {testimonial.name}
                    </h4>
                    <p className="text-sm text-gray-500">{testimonial.title}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about-us" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <motion.h2
              className="text-3xl md:text-4xl font-bold text-[#4d2d61] mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Our Development Team
            </motion.h2>
            <motion.p
              className="text-xl text-gray-600 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Meet the talented individuals behind Nexus Community
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Salma Yasser",
                role: "Full Stack Developer",
                description:
                  "Develops both frontend and backend components of the application.",
                avatar: `https://ui-avatars.com/api/?name=Salma+Yasser&background=4D2D61&color=fff&bold=true&size=128`,
              },
              {
                name: "Rana Mohamed",
                role: "Frontend Developer",
                description:
                  "Specializes in creating responsive and interactive user interfaces.",
                avatar: `https://ui-avatars.com/api/?name=Rana+Mohamed&background=725483&color=fff&bold=true&size=128`,
              },
              {
                name: "Amena Elsheikh",
                role: "UI/UX & Frontend Developer",
                description:
                  "Designs and implements intuitive user experiences.",
                avatar: `https://ui-avatars.com/api/?name=Amena+Elsheikh&background=4D2D61&color=fff&bold=true&size=128`,
              },
              {
                name: "Fatma Emad",
                role: "Frontend Developer",
                description: "Creates dynamic and responsive interfaces.",
                avatar: `https://ui-avatars.com/api/?name=Fatma+Emad&background=725483&color=fff&bold=true&size=128`,
              },
              {
                name: "Youssef Shaheen",
                role: "Backend Developer",
                description:
                  "Designs and implements RESTful APIs and data management systems.",
                avatar: `https://ui-avatars.com/api/?name=Youssef+Shaheen&background=4D2D61&color=fff&bold=true&size=128`,
              },
              {
                name: "Adham Khaled",
                role: "Backend Developer",
                description:
                  "Specializes in API architecture and database optimization.",
                avatar: `https://ui-avatars.com/api/?name=Adham+Khaled&background=725483&color=fff&bold=true&size=128`,
              },
            ].map((member, index) => (
              <motion.div
                key={index}
                className="bg-white rounded-xl shadow-lg p-6 border border-purple-100 hover:shadow-xl transition-all duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5, backgroundColor: "#f9f5ff" }}
              >
                <div className="flex flex-col items-center text-center">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-24 h-24 rounded-full mb-4 shadow-md"
                  />
                  <h3 className="text-xl font-semibold text-[#4d2d61] mb-1">
                    {member.name}
                  </h3>
                  <p className="text-purple-600 font-medium mb-3">
                    {member.role}
                  </p>
                  <p className="text-gray-600">{member.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#4d2d61]">
        <div className="container mx-auto px-4 text-center">
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-white mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Ready to Transform Your Team's Workflow?
          </motion.h2>
          <motion.p
            className="text-xl text-white/80 max-w-2xl mx-auto mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Join thousands of teams already using Nexus Community to boost their
            productivity
          </motion.p>
          <motion.button
            className="px-8 py-3 bg-white text-[#4d2d61] font-medium rounded-lg text-lg shadow-xl flex items-center mx-auto"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            onClick={() => navigate("/signup")}
          >
            Start Your Free Trial <ArrowRight className="ml-2 w-5 h-5" />
          </motion.button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-gray-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <img src={logoImage} alt="Nexus Logo" className="h-10 mb-4" />
              <p className="text-gray-600 mb-4">
                Unite your team, amplify your success with the most
                comprehensive collaboration platform.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-[#4d2d61] mb-4">Product</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#features"
                    className="text-gray-600 hover:text-[#4d2d61]"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-[#4d2d61]">
                    Integrations
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-gray-600 hover:text-[#4d2d61]"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-[#4d2d61]">
                    Roadmap
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-[#4d2d61] mb-4">Resources</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-600 hover:text-[#4d2d61]">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-[#4d2d61]">
                    Guides
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-[#4d2d61]">
                    Support
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-[#4d2d61]">
                    API
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-[#4d2d61] mb-4">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-600 hover:text-[#4d2d61]">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-[#4d2d61]">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-[#4d2d61]">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-[#4d2d61]">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-100 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} Nexus Community. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-[#4d2d61]">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-[#4d2d61]">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-[#4d2d61]">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427a4.902 4.902 0 011.153 1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-[#4d2d61]">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

// Calendar Demo Component for Landing Page
const CalendarDemoComponent = () => {
  const [demoState, setDemoState] = useState("calendar"); // calendar, addMeeting, showAdded
  const [showTooltip, setShowTooltip] = useState(false);

  // Demo meeting data
  const initialMeetings = [
    {
      id: 1,
      name: "Team Standup",
      date: new Date(),
      time: { startTime: "10:00", endTime: "11:00" },
      color: "#4d2d61",
    },
    {
      id: 2,
      name: "Client Meeting",
      date: new Date(),
      time: { startTime: "14:00", endTime: "15:00" },
      color: "#0D9488",
    },
  ];

  const [meetings, setMeetings] = useState(initialMeetings);
  const [newMeeting, setNewMeeting] = useState({
    name: "Product Review",
    date: new Date(),
    time: { startTime: "11:30", endTime: "13:00" },
    color: "#F97316",
  });

  // Auto-cycle through demo states
  useEffect(() => {
    const timer = setTimeout(
      () => {
        if (demoState === "calendar") {
          setDemoState("addMeeting");
        } else if (demoState === "addMeeting") {
          setDemoState("showAdded");
          setMeetings([...meetings, newMeeting]);
        } else {
          setDemoState("calendar");
        }
      },
      demoState === "addMeeting" ? 4000 : 3000
    );

    return () => clearTimeout(timer);
  }, [demoState]);

  // Generate calendar days
  const generateCalendarDays = () => {
    const days = [];
    const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

    // Day labels
    days.push(
      <div
        key="labels"
        className="grid grid-cols-7 gap-1 text-[10px] text-center mb-1"
      >
        {dayLabels.map((day, i) => (
          <div key={i} className="text-gray-500">
            {day}
          </div>
        ))}
      </div>
    );

    // Calendar days
    const rows = [];
    for (let week = 0; week < 5; week++) {
      const weekDays = [];
      for (let day = 1; day <= 7; day++) {
        const dayNum = week * 7 + day;
        const isToday = dayNum === 15;
        const hasMeeting = [15, 16, 22].includes(dayNum);

        weekDays.push(
          <div
            key={dayNum}
            className={`aspect-square flex flex-col items-center justify-center rounded-full relative
              ${isToday ? "bg-[#4d2d61] text-white" : ""}
              ${hasMeeting && !isToday ? "font-medium" : ""}
            `}
          >
            {dayNum <= 31 ? dayNum : ""}
            {hasMeeting && !isToday && (
              <div className="absolute bottom-1 w-1 h-1 rounded-full bg-[#4d2d61]"></div>
            )}
          </div>
        );
      }
      rows.push(
        <div
          key={`week-${week}`}
          className="grid grid-cols-7 gap-1 text-[10px] text-center"
        >
          {weekDays}
        </div>
      );
    }

    return [...days, ...rows];
  };

  // Render meeting events for the demo
  const renderMeetings = () => {
    return meetings.map((meeting, index) => {
      const startHour = parseInt(meeting.time.startTime.split(":")[0]);
      const startMinute = parseInt(meeting.time.startTime.split(":")[1]);
      const endHour = parseInt(meeting.time.endTime.split(":")[0]);
      const endMinute = parseInt(meeting.time.endTime.split(":")[1]);

      const top = ((startHour * 60 + startMinute - 8 * 60) / (12 * 60)) * 100;
      const height =
        ((endHour * 60 + endMinute - (startHour * 60 + startMinute)) /
          (12 * 60)) *
        100;

      return (
        <motion.div
          key={meeting.id || index}
          className="absolute left-[60px] right-2 rounded-md px-2 py-1 text-xs font-medium shadow-sm"
          style={{
            top: `${top}%`,
            height: `${height}%`,
            backgroundColor: meeting.color,
            color: "#fff",
          }}
          initial={meeting.id === 3 ? { opacity: 0, x: 20 } : { opacity: 1 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.02 }}
        >
          {meeting.name}
        </motion.div>
      );
    });
  };

  // Render time labels
  const renderTimeLabels = () => {
    return Array.from({ length: 9 }).map((_, i) => {
      const hour = i + 8; // Start from 8 AM
      return (
        <div
          key={i}
          className="text-[9px] text-gray-500 absolute"
          style={{ top: `${i * 12.5}%`, left: "5px" }}
        >
          {hour > 12 ? `${hour - 12}pm` : `${hour}am`}
        </div>
      );
    });
  };

  return (
    <div className="w-full h-full">
      {/* Header */}
      <div className="flex items-center p-3 border-b border-gray-100">
        <div className="w-10 h-10 rounded-lg bg-[#4d2d61]/10 flex items-center justify-center mr-3">
          <Calendar className="w-5 h-5 text-[#4d2d61]" />
        </div>
        <h3 className="font-semibold text-[#4d2d61]">Calendar</h3>

        {demoState === "calendar" && (
          <motion.button
            className="ml-auto w-8 h-8 rounded-full bg-[#4d2d61]/10 flex items-center justify-center"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setDemoState("addMeeting")}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <Plus className="w-4 h-4 text-[#4d2d61]" />

            {showTooltip && (
              <motion.div
                className="absolute top-full mt-1 right-0 bg-gray-800 text-white text-xs py-1 px-2 rounded"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                Add Meeting
              </motion.div>
            )}
          </motion.button>
        )}
      </div>

      {/* Calendar View */}
      <AnimatePresence mode="wait">
        {demoState === "calendar" && (
          <motion.div
            key="calendar-view"
            className="p-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                <button className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <ArrowRight className="w-3 h-3 text-gray-600 rotate-180" />
                </button>
                <span className="mx-2 text-sm font-medium">June 2023</span>
                <button className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <ArrowRight className="w-3 h-3 text-gray-600" />
                </button>
              </div>
              <div className="flex space-x-1">
                <button className="px-2 py-0.5 text-[10px] bg-[#4d2d61] text-white rounded">
                  Month
                </button>
                <button className="px-2 py-0.5 text-[10px] text-gray-600 bg-gray-100 rounded">
                  Week
                </button>
                <button className="px-2 py-0.5 text-[10px] text-gray-600 bg-gray-100 rounded">
                  Day
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#f9f5ff] to-white rounded-lg p-2">
              {generateCalendarDays()}
            </div>
          </motion.div>
        )}

        {demoState === "showAdded" && (
          <motion.div
            key="day-view"
            className="p-3 h-[350px] relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                <button className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <ArrowRight className="w-3 h-3 text-gray-600 rotate-180" />
                </button>
                <span className="mx-2 text-sm font-medium">June 15, 2023</span>
                <button className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <ArrowRight className="w-3 h-3 text-gray-600" />
                </button>
              </div>
              <div className="flex space-x-1">
                <button className="px-2 py-0.5 text-[10px] text-gray-600 bg-gray-100 rounded">
                  Month
                </button>
                <button className="px-2 py-0.5 text-[10px] text-gray-600 bg-gray-100 rounded">
                  Week
                </button>
                <button className="px-2 py-0.5 text-[10px] bg-[#4d2d61] text-white rounded">
                  Day
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg p-2 h-[300px] relative overflow-hidden">
              {renderTimeLabels()}
              <div className="absolute top-0 bottom-0 left-[50px] w-px bg-gray-100"></div>
              {renderMeetings()}
            </div>
          </motion.div>
        )}

        {demoState === "addMeeting" && (
          <motion.div
            key="add-meeting"
            className="p-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-sm text-[#4d2d61]">
                  Add Meeting
                </h4>
                <button onClick={() => setDemoState("calendar")}>
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    value="Product Review"
                    readOnly
                    className="w-full px-3 py-2 text-sm bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4d2d61]"
                    placeholder="Meeting Name"
                  />
                </div>

                <div className="flex space-x-2">
                  <div className="flex-1 flex items-center px-3 py-2 bg-gray-50 rounded-lg">
                    <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-xs text-gray-700">
                      {format(new Date(), "EEE, MMM d")}
                    </span>
                  </div>

                  <div className="flex-1 flex items-center px-3 py-2 bg-gray-50 rounded-lg">
                    <Clock className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-xs text-gray-700">
                      1:00 - 2:00 PM
                    </span>
                  </div>
                </div>

                <div className="flex items-center px-3 py-2 bg-gray-50 rounded-lg">
                  <LinkIcon className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-xs text-gray-700">
                    meet.nexus.com/product-review
                  </span>
                </div>

                <div className="flex items-center px-3 py-2 bg-gray-50 rounded-lg">
                  <Users className="w-4 h-4 text-gray-500 mr-2" />
                  <div className="flex space-x-1">
                    {["SY", "RM", "AE"].map((initials, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full bg-[#4d2d61] text-white text-[8px] flex items-center justify-center"
                      >
                        {initials}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2">
                  {["#4d2d61", "#0D9488", "#F97316", "#7DD3FC"].map(
                    (color, i) => (
                      <div
                        key={i}
                        className={`w-6 h-6 rounded-full ${
                          color === "#F97316"
                            ? "ring-2 ring-offset-2 ring-[#F97316]"
                            : ""
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    )
                  )}
                </div>

                <motion.button
                  className="w-full py-2 bg-[#4d2d61] text-white text-sm font-medium rounded-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDemoState("showAdded")}
                >
                  Save Meeting
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
