import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Container,
  Button,
  UncontrolledTooltip,
  Input,
  DropdownToggle,
  DropdownMenu,
  Dropdown,
  DropdownItem,
  Row,
  Col,
  Card,
  CardBody,
  UncontrolledDropdown,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
} from "reactstrap";
import { Link, useSearchParams } from "react-router-dom";
import SimpleBar from "simplebar-react";
import classnames from "classnames";
import Picker from "emoji-picker-react";
import { isEmpty } from "lodash";
import * as url from "../../helpers/url_helper";
 //Import Icons
import FeatherIcon from "feather-icons-react";
import PersonalInfo from "./PersonalInfo";
import DeleteModal from "../../Components/Common/DeleteModal";
import ChatFileUpload from "../../Components/Common/ChatFileUpload";

//redux
import { useSelector, useDispatch } from "react-redux";
import {
  getDirectContact as onGetDirectContact,
  getMessages,
  getChannels as onGetChannels,
  addMessage as onAddMessage,
} from "../../slices/thunks";
import { getUnreadNotifications } from "../../slices/notifications/thunk";

import avatar2 from "../../assets/images/users/avatar-2.jpg";
import userDummayImage from "../../assets/images/users/user-dummy-img.jpg";

//Import Scrollbar
import PerfectScrollbar from "react-perfect-scrollbar";
import "react-perfect-scrollbar/dist/css/styles.css";
import { createSelector } from "reselect";

import "./chat-styles.css";

const getFileType = (fileName) => {
  if (!fileName) return "unknown";
  // Strip query string before extracting extension
  const cleanName = (fileName || "").split("?")[0];
  const ext = cleanName.split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext))
    return "image";
  if (["mp4", "webm", "ogg", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["pdf"].includes(ext)) return "pdf";
  if (["xls", "xlsx", "csv"].includes(ext)) return "excel";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "zip";
  return "file";
};

const getFileIcon = (type) => {
  switch (type) {
    case "pdf":
      return { icon: "ri-file-pdf-line", bg: "#ef4444" };
    case "excel":
      return { icon: "ri-file-excel-line", bg: "#10b981" };
    case "word":
      return { icon: "ri-file-word-line", bg: "#3b82f6" };
    case "zip":
      return { icon: "ri-folder-zip-line", bg: "#f59e0b" };
    default:
      return { icon: "ri-file-line", bg: "#6b7280" };
  }
};

const getMessageText = (message) =>
  message?.message ||
  message?.text ||
  message?.content ||
  message?.messageText ||
  "";

const getMessageId = (message) =>
  message?.messageId ??
  message?.MessageId ??
  message?.id ??
  message?.message_id ??
  null;

const getMessageFileUrl = (message) => {
  if (!message?.fileLink) return "";
  if (/^https?:\/\//i.test(message.fileLink)) return message.fileLink;
  return `${configApi.API_URL}${message.fileLink}`;
};

const isImageMessage = (message) =>
  message?.messageType === "file" && getFileType(message.fileLink) === "image";

const getUserId = (user) => user?.id ?? user?.UserId ?? user?.userId;

const isSameId = (left, right) =>
  left !== undefined &&
  left !== null &&
  right !== undefined &&
  right !== null &&
  left.toString() === right.toString();

const getUserName = (user) =>
  user?.FullName ||
  user?.full_name ||
  user?.firstName ||
  user?.name ||
  user?.UserName ||
  user?.userName ||
  user?.Username ||
  user?.username ||
  "Unknown User";

const getCompanyId = (authUser) =>
  authUser?.user?.companyId || authUser?.companyId || 1;

const getMessageParticipantId = (message, currentUserId) => {
  const senderId = message?.senderUserId ?? message?.senderId;
  const receiverId = message?.receiverUserId ?? message?.receiverId;
  return senderId?.toString() === currentUserId?.toString()
    ? receiverId
    : senderId;
};

const getMessageReadAt = (message) => message?.readAt ?? message?.read_at ?? null;

const isMessageFromCurrentUser = (message, currentUserId) =>
  isSameId(message?.senderUserId ?? message?.senderId, currentUserId);

const renderMessageStatusIcon = (message) => {
  const readAt = getMessageReadAt(message);
  if (readAt) {
    return (
      <span className="text-success check-message-icon">
        <i className="ri-check-double-line align-bottom"></i>
      </span>
    );
  }
  return (
    <span className="text-muted check-message-icon">
      <i className="ri-check-line align-bottom"></i>
    </span>
  );
};

const getMessageCreatedAt = (message) => {
  if (!message) return null;
  const raw =
    message.createdDate ??
    message.created_date ??
    message.CreatedDate ??
    message.createdAt ??
    message.created_at ??
    null;
  if (!raw) return null;
  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDayMs = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const isSameCalendarDay = (left, right) => {
  if (!left || !right) return false;
  return startOfDayMs(left) === startOfDayMs(right);
};

/** WhatsApp-style: Today | Yesterday | D/M/YYYY (e.g. 24/6/2025) */
const formatChatDayLabel = (date) => {
  if (!date) return "";
  const now = new Date();
  const dayDiff = Math.round(
    (startOfDayMs(now) - startOfDayMs(date)) / (24 * 60 * 60 * 1000),
  );
  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

const formatMessageTime = (message) => {
  const date = getMessageCreatedAt(message);
  if (!date) return "";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const sortMessagesChronologically = (list) => {
  if (!Array.isArray(list) || list.length === 0) return [];
  return [...list].sort((a, b) => {
    const left = getMessageCreatedAt(a);
    const right = getMessageCreatedAt(b);
    if (!left && !right) return 0;
    if (!left) return -1;
    if (!right) return 1;
    return left.getTime() - right.getTime();
  });
};

// ── SignalR real-time integration ─────────────────────────────────────────────
import useSignalRChat from "../../Components/Hooks/useSignalRChat";
import {
  appendRealtimeMessage,
  updateChatLastMessage,
  setSignalRStatus,
  setMessagesData,
  removeMessage,
} from "../../slices/chat/reducer";
import { toast } from "react-toastify";

import { APIClient, getLoggedinUser } from "../../helpers/api_helper";
import { api as configApi } from "../../config";
const api = new APIClient();

const Chat = () => {
  const userChatShow = useRef();
  const [customActiveTab, setcustomActiveTab] = useState("1");
  const toggleCustom = (tab) => {
    if (customActiveTab !== tab) {
      setcustomActiveTab(tab);
    }
  };

  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isInfoDetails, setIsInfoDetails] = useState(false);
  const [Chat_Box_Username, setChat_Box_Username] = useState("");
  const [Chat_Box_Image, setChat_Box_Image] = useState(avatar2);
  const [currentRoomId, setCurrentRoomId] = useState(1);
  const [messageBox, setMessageBox] = useState(null);
  const [curMessage, setcurMessage] = useState("");
  const [search_Menu, setsearch_Menu] = useState(false);
  const [settings_Menu, setsettings_Menu] = useState(false);
  const [reply, setreply] = useState("");
  const [emojiPicker, setemojiPicker] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [deleteModal, setDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);

  const [showModal, setShowModal] = useState(false);
  // File upload state & ref
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const authUser = getLoggedinUser();
  const loggedInUserId =
    authUser?.user?.id ??
    authUser?.user?.userId ??
    authUser?.userId ??
    authUser?.id ??
    0;
  const loggedInCompanyId = getCompanyId(authUser);
  const loggedInUserName =
    authUser?.user?.firstName || authUser?.user?.username || "User";

  const [chatUsers, setChatUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Group contacts by first letter
  const groupedContacts = chatUsers.reduce((acc, user) => {
    const name =
      user.FullName ||
      user.full_name ||
      user.firstName ||
      user.name ||
      user.Username ||
      user.username ||
      "U";
    const title = name.charAt(0).toUpperCase();
    if (!acc[title]) {
      acc[title] = { title, contacts: [] };
    }
    acc[title].contacts.push(user);
    return acc;
  }, {});
  const sortedGroupedContacts = Object.values(groupedContacts).sort((a, b) =>
    a.title.localeCompare(b.title),
  );

  const selectLayoutState = (state) => state.Chat;
  const chatProperties = createSelector(selectLayoutState, (state) => ({
    chats: state.chats,
    messages: state.messages,
    channels: state.channels,
    signalRStatus: state.signalRStatus,
  }));
  // Inside your component
  const { chats, messages, channels, signalRStatus } =
    useSelector(chatProperties);

  const sortedMessages = React.useMemo(
    () => sortMessagesChronologically(messages),
    [messages],
  );

  // Layout theme handling
  const selectLayoutProperties = createSelector(
    (state) => state.Layout,
    (layout) => ({
      layoutModeType: layout?.layoutModeType,
    }),
  );
  const { layoutModeType } = useSelector(selectLayoutProperties);
  const isDarkMode = layoutModeType === "dark";

  //Toggle Chat Box Menus
  const toggleSearch = () => {
    setsearch_Menu(!search_Menu);
  };

  //Info details offcanvas
  const toggleInfo = async () => {
    if (!selectedUser) return;

    try {
      const response = await api.get("/api/chat/attachments", {
        params: {
          senderUserId: loggedInUserId,
          receiverUserId: selectedUser?.UserId,
          companyId: localStorage.getItem("companyId"),
        },
      });

      // Handle both { success: true, data: [...] } and direct array responses
      const attachmentData =
        response?.data?.data || // { success: true, data: [...] }
        response?.data || // { data: [...] }
        response || // direct array
        [];

      setChatAttachments(Array.isArray(attachmentData) ? attachmentData : []);
    } catch (error) {
      console.error("Error loading attachments:", error);
      setChatAttachments([]);
    } finally {
      // Always open the panel, even if attachments fail to load
      setIsInfoDetails(true);
    }
  };
  const toggleSettings = () => {
    setsettings_Menu(!settings_Menu);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const [usersRes, chatListRes] = await Promise.all([
          api.get("/api/master/User"),
          api.get(`/api/chat/chat-list/${loggedInUserId}/${loggedInCompanyId}`),
        ]);
        const allUsers = (usersRes?.data || usersRes || []).filter(
          (u) => getUserId(u)?.toString() !== loggedInUserId?.toString(),
        );
        const chatList = chatListRes?.data || chatListRes || [];
        const chatByUserId = new Map(
          chatList.map((chat) => [
            (chat.userId ?? chat.UserId)?.toString(),
            chat,
          ]),
        );
        const mergedUsers = allUsers.map((user) => {
          const chat = chatByUserId.get(getUserId(user)?.toString());
          return {
            ...user,
            lastMessage: chat?.lastMessage ?? chat?.LastMessage ?? "",
            lastMessageDate:
              chat?.lastMessageDate ?? chat?.LastMessageDate ?? null,
            unreadCount: chat?.unreadCount ?? chat?.UnreadCount ?? 0,
          };
        });

        chatList.forEach((chat) => {
          const chatUserId = chat.userId ?? chat.UserId;
          const exists = mergedUsers.some(
            (user) => getUserId(user)?.toString() === chatUserId?.toString(),
          );
          if (!exists) {
            mergedUsers.push({
              id: chatUserId,
              name: chat.userName ?? chat.UserName ?? "Unknown User",
              lastMessage: chat.lastMessage ?? chat.LastMessage ?? "",
              lastMessageDate:
                chat.lastMessageDate ?? chat.LastMessageDate ?? null,
              unreadCount: chat.unreadCount ?? chat.UnreadCount ?? 0,
            });
          }
        });

        mergedUsers.sort((a, b) => {
          const left = a.lastMessageDate
            ? new Date(a.lastMessageDate).getTime()
            : 0;
          const right = b.lastMessageDate
            ? new Date(b.lastMessageDate).getTime()
            : 0;
          return right - left;
        });

        setChatUsers(mergedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    if (loggedInUserId) {
      fetchUsers();
    }
  }, [loggedInCompanyId, loggedInUserId]);

  const openUserFromUrlHandled = useRef(false);

  // Use For Chat Box
  const userChatOpen = async (user) => {
    const userId = getUserId(user);
    setSelectedUser({ ...user, unreadCount: 0 });
    setChatUsers((users) =>
      users.map((u) =>
        getUserId(u)?.toString() === userId?.toString()
          ? { ...u, unreadCount: 0 }
          : u,
      ),
    );
    setChat_Box_Username(getUserName(user));
    setChat_Box_Image(user.image);

    // Create a deterministic roomId based on both user IDs to use for SignalR auto-scroll tracking
    const roomId =
      loggedInUserId < userId
        ? `${loggedInUserId}-${userId}`
        : `${userId}-${loggedInUserId}`;
    setCurrentRoomId(roomId);

    if (window.innerWidth < 892) {
      userChatShow.current.classList.add("user-chat-show");
    }

    try {
      setIsLoadingMessages(true);
      const [, res] = await Promise.all([
        api
          .put(
            `${url.MARK_CHAT_AS_READ}?senderId=${userId}&receiverId=${loggedInUserId}`,
            {},
          )
          .catch((markReadError) => {
            console.error("Error marking messages as read:", markReadError);
          }),
        api.get(`/api/chat/conversation/${loggedInUserId}/${userId}`),
      ]);

      if (loggedInCompanyId && loggedInUserId) {
        dispatch(
          getUnreadNotifications({
            companyId: Number(loggedInCompanyId),
            userId: Number(loggedInUserId),
          }),
        );
      }
      const payload = res?.data ?? res;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
      dispatch(setMessagesData(list));
    } catch (error) {
      console.error("Error fetching conversation:", error);
      dispatch(setMessagesData([]));
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    const openUserId = searchParams.get("openUserId");
    if (
      !openUserId ||
      openUserFromUrlHandled.current ||
      isLoadingUsers ||
      chatUsers.length === 0
    ) {
      return;
    }

    const targetUser = chatUsers.find(
      (user) => getUserId(user)?.toString() === openUserId.toString(),
    );

    if (targetUser) {
      openUserFromUrlHandled.current = true;
      userChatOpen(targetUser);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, chatUsers, isLoadingUsers, setSearchParams]);

  const backToUserChat = () => {
    userChatShow.current.classList.remove("user-chat-show");
  };

  const addMessage = async () => {
    if (!curMessage.trim() || !selectedUser) return;

    const messageText = curMessage;
    const replyingTo = reply;
    setcurMessage(""); // clear immediately for UX
    setreply(""); // clear reply bar immediately

    try {
      const payload = {
        companyId: loggedInCompanyId,
        senderUserId: loggedInUserId,
        receiverUserId: getUserId(selectedUser),
        messageText: messageText,
        messageType: "text",
        replyMessageId: replyingTo
          ? replyingTo.id || replyingTo.messageId || null
          : null,
      };

      const res = await api.post("/api/chat/send", payload);

      if (!res?.success || !res?.data) {
        console.error("Send message failed:", res?.message || res);
        setcurMessage(messageText);
        if (replyingTo) setreply(replyingTo);
        return;
      }

      const savedMessage = {
        ...res.data,
        readAt: null,
        read_at: null,
      };
      dispatch(appendRealtimeMessage(savedMessage));
      handleRealtimeMessage(savedMessage, {
        isActiveChat: true,
        isIncomingForCurrentUser: false,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setcurMessage(messageText);
      if (replyingTo) setreply(replyingTo);
    }
  };

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (messageBox) {
        messageBox.scrollTop = messageBox.scrollHeight + 1000;
      }
    }, 100);
  }, [messageBox]);

  useEffect(() => {
    if (!isEmpty(messages)) scrollToBottom();
  }, [messages, scrollToBottom]);

  // Scroll to bottom after messages finish loading (WhatsApp-style: open at latest message)
  useEffect(() => {
    if (!isLoadingMessages) {
      scrollToBottom();
    }
  }, [isLoadingMessages]);

  const handleRealtimeMessage = useCallback(
    (incomingMessage, { isActiveChat, isIncomingForCurrentUser } = {}) => {
      if (incomingMessage?.isDeleted || incomingMessage?.is_deleted) return;

      const otherUserId = getMessageParticipantId(
        incomingMessage,
        loggedInUserId,
      );
      const messageText =
        getMessageText(incomingMessage) ||
        (incomingMessage?.messageType === "file" ? "Attachment" : "");
      const createdDate =
        incomingMessage?.createdDate ||
        incomingMessage?.createdAt ||
        new Date().toISOString();

      setChatUsers((users) => {
        const existingUser = users.find(
          (user) => getUserId(user)?.toString() === otherUserId?.toString(),
        );
        const nextUsers = users.filter(
          (user) => getUserId(user)?.toString() !== otherUserId?.toString(),
        );
        const unreadCount =
          isIncomingForCurrentUser && !isActiveChat
            ? (existingUser?.unreadCount || 0) + 1
            : isActiveChat
              ? 0
              : existingUser?.unreadCount || 0;
        const updatedUser = {
          ...(existingUser || {
            id: otherUserId,
            name: incomingMessage?.senderName || "Unknown User",
          }),
          lastMessage: messageText,
          lastMessageDate: createdDate,
          unreadCount,
        };

        return [updatedUser, ...nextUsers];
      });
    },
    [loggedInUserId],
  );

  // ── SignalR real-time integration ─────────────────────────────────────────
  // Connects to chatHub, listens to ReceiveMessage, updates Redux + sidebar,
  // handles reconnection states, and cleans up listeners on unmount.

  const { sendToHub } = useSignalRChat({
    currentRoomId,
    currentUserId: loggedInUserId,
    activeChatUserId: getUserId(selectedUser),
    scrollToBottom,
    onMessageReceived: handleRealtimeMessage,
    getToken: () => localStorage.getItem("authToken"),
  });

  const onKeyPress = (e) => {
    const { key, value } = e;
    if (key === "Enter") {
      e.preventDefault();
      setcurMessage(value);
      addMessage();
    }
  };

  //serach recent user
  const searchUsers = () => {
    var input, filter, li, a, i, txtValue;
    input = document.getElementById("search-user");
    filter = input.value.toUpperCase();
    var userList = document.getElementsByClassName("users-list");
    Array.prototype.forEach.call(userList, function (el) {
      li = el.getElementsByTagName("li");
      for (i = 0; i < li.length; i++) {
        a = li[i].getElementsByTagName("a")[0];
        txtValue = a.textContent || a.innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
          li[i].style.display = "";
        } else {
          li[i].style.display = "none";
        }
      }
    });
  };

  //Search Message — highlights matched text and filters non-matching
  const searchMessages = (e) => {
    const val = e.target.value;
    setSearchText(val);
    const searchFilter = val.toUpperCase();
    const searchUL = document.getElementById("users-conversation");
    if (!searchUL) return;
    const searchLI = searchUL.getElementsByTagName("li");
    Array.prototype.forEach.call(searchLI, function (search) {
      const a = search.getElementsByTagName("p")[0] || "";
      const txtValue = a.textContent || a.innerText || "";
      if (!searchFilter || txtValue.toUpperCase().indexOf(searchFilter) > -1) {
        search.style.display = "";
      } else {
        search.style.display = "none";
      }
    });
  };

  // Highlight search matches inside message text
  const highlightText = (text, search) => {
    if (!search || !text) return text;
    try {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const parts = String(text).split(new RegExp(`(${escaped})`, "gi"));
      return parts.map((part, i) =>
        part.toLowerCase() === search.toLowerCase() ? (
          <mark key={i} className="chat-search-highlight">
            {part}
          </mark>
        ) : (
          part
        ),
      );
    } catch (_) {
      return text;
    }
  };

  const showCopyAlert = () => {
    const copyAlert = document.getElementById("copyClipBoard");
    if (!copyAlert) return;
    copyAlert.style.display = "block";
    setTimeout(() => {
      copyAlert.style.display = "none";
    }, 2000);
  };

  // Copy Message
  const handleCkick = (ele) => {
    const copy = ele
      .closest(".chat-list")
      ?.querySelector(".ctext-content")?.innerText;
    if (!copy) return;
    navigator.clipboard.writeText(copy);
    showCopyAlert();
  };

  const handleCopyImage = (message) => {
    const imageUrl = getMessageFileUrl(message);
    if (!imageUrl) return;
    navigator.clipboard.writeText(imageUrl);
    showCopyAlert();
  };

  const handleDownloadImage = async (message) => {
    const imageUrl = getMessageFileUrl(message);
    if (!imageUrl) return;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const fileName =
        getMessageText(message) ||
        message.fileLink?.split("/").pop()?.split("?")[0] ||
        "image";

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(imageUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDeleteMessage = (message) => {
    const messageId = getMessageId(message);

    if (!messageId) return;
    setMessageToDelete(message);
    setDeleteModal(true);
  };

  const confirmDeleteMessage = async () => {
    const messageId = getMessageId(messageToDelete);
    const senderUserId =
      messageToDelete?.senderUserId ??
      messageToDelete?.senderId ??
      loggedInUserId;

    setDeleteModal(false);
    setMessageToDelete(null);

    if (!messageId || !senderUserId) {
      toast.error("Unable to delete: missing message or user id");
      return;
    }

    try {
      const res = await api.delete(
        `/api/chat/message/${messageId}?senderUserId=${Number(senderUserId)}`,
      );
      if (res?.success === false) {
        throw new Error(res?.message || "Failed to delete message");
      }
      dispatch(removeMessage(messageId));
      toast.success("Message deleted successfully", { autoClose: 2000 });
    } catch (error) {
      const errMsg =
        typeof error === "string"
          ? error
          : error?.message || "Failed to delete message";
      toast.error(errMsg);
    }
  };

  // emoji
  const [emojiArray, setemojiArray] = useState("");

  const onEmojiClick = (event, emojiObject) => {
    setemojiArray([...emojiArray, emojiObject.emoji]);
    let emoji = [...emojiArray, emojiObject.emoji].join(" ");
    setcurMessage(curMessage + event.emoji);
  };

  const handleAttachmentClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setShowModal(true);
    
      event.target.value = "";
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("companyId", loggedInCompanyId);
      formData.append("senderUserId", loggedInUserId);
      formData.append("receiverUserId", getUserId(selectedUser));
      formData.append("file", file);

      await api.post("/api/chat/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // Do NOT manually append message. SignalR will handle it.
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading file.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };
  const [chatAttachments, setChatAttachments] = useState([]);

  // const loadAttachments = async () => {
  //   console.log("LOAD ATTACHMENTS RUNNING");

  //   try {
  //     const response = await api.get("api/chat/attachments", {
  //       params: {
  //         senderUserId: loggedInUserId,
  //         receiverUserId: selectedUser?.UserId,
  //         companyId: localStorage.getItem("companyId"),
  //       },
  //     });

  //     console.log(response.data);

  //     if (response?.data?.success) {
  //       setChatAttachments(response.data.data || []);
  //     }
  //   } catch (error) {
  //     console.error(error);
  //   }
  // };
  const triggerHighlight = (element) => {
    element.classList.remove("highlight-message");
    void element.offsetWidth; // force reflow to restart animation
    element.classList.add("highlight-message");

    setTimeout(() => {
        element.classList.remove("highlight-message");
    }, 2500);
};

const scrollToMessage = (replyMessageId) => {
    const element = document.querySelector(`#message-${replyMessageId}`);
    if (!element) return;

    // Target the Perfect Scrollbar container
    const container = element.closest('.scrollbar-container');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    // Scroll to center the message
    container.scrollTop = container.scrollTop + elementRect.top - containerRect.top - container.clientHeight / 2;

    // Refresh Perfect Scrollbar after manual scroll
    if (window.PerfectScrollbar) {
        const ps = container._ps; // internal PS instance
        ps?.update();
    }

    // Highlight after scroll
    setTimeout(() => {
        element.classList.remove('highlight-message');
        void element.offsetWidth;
        element.classList.add('highlight-message');
        setTimeout(() => element.classList.remove('highlight-message'), 2500);
    }, 300);
};
  document.title = "Chat | SoftBook - React Admin & Dashboard Template";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <div className="chat-wrapper d-lg-flex gap-1 mx-n4 mt-n4 p-1">
            <div className="chat-leftsidebar">
              <div className="px-4 pt-4 mb-3">
                <div className="d-flex align-items-start">
                  <div className="flex-grow-1">
                    <h5 className="mb-4">Chats</h5>
                  </div>
              
                </div>
                <div className="search-box">
                  <input
                    onKeyUp={searchUsers}
                    id="search-user"
                    type="text"
                    className={`form-control ${isDarkMode ? "bg-dark border-dark text-white" : "bg-light border-light text-body"}`}
                    placeholder="Search here..."
                  />
                  <i className="ri-search-2-line search-icon"></i>
                </div>
              </div>

              <Nav
                tabs
                className="nav nav-tabs nav-tabs-custom nav-success nav-justified mb-3"
              >
                <NavItem>
                  <NavLink
                    style={{ cursor: "pointer" }}
                    className={classnames({
                      active: customActiveTab === "1",
                    })}
                    onClick={() => {
                      toggleCustom("1");
                    }}
                  >
                    Chats
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    style={{ cursor: "pointer" }}
                    className={classnames({
                      active: customActiveTab === "2",
                    })}
                    onClick={() => {
                      toggleCustom("2");
                    }}
                  >
                    Contacts
                  </NavLink>
                </NavItem>
              </Nav>

              <TabContent activeTab={customActiveTab} className="text-muted">
                <TabPane tabId="1" id="chats">
                  <SimpleBar
                    className="chat-room-list pt-3"
                    style={{ margin: "-16px 0px 0px" }}
                  >
                    <div className="d-flex align-items-center px-4 mb-2">
                      <div className="flex-grow-1">
                        <h4 className="mb-0 fs-11 text-muted text-uppercase">
                          Direct Messages
                        </h4>
                      </div>
                     
                    </div>

                    <div className="chat-message-list">
                      {isLoadingUsers && (
                        <div className="p-3 text-center text-muted">
                          Loading users...
                        </div>
                      )}
                      {!isLoadingUsers && chatUsers.length === 0 && (
                        <div className="p-3 text-center text-muted">
                          No users found.
                        </div>
                      )}
                      <ul
                        className="list-unstyled chat-list chat-user-list users-list"
                        id="userList"
                      >
                        {(chatUsers || []).map((user) => (
                          <li
                            key={getUserId(user)}
                            className={
                              isSameId(getUserId(selectedUser), getUserId(user))
                                ? "active"
                                : ""
                            }
                          >
                            <Link
                              to="#"
                              onClick={(e) => {
                                e.preventDefault();
                                userChatOpen(user);
                              }}
                            >
                              <div className="d-flex align-items-center">
                                <div className="flex-shrink-0 chat-user-img online align-self-center me-2 ms-0">
                                  <div className="avatar-xxs">
                                    {user.image ? (
                                      <img
                                        src={user.image}
                                        className="rounded-circle img-fluid userprofile"
                                        alt=""
                                      />
                                    ) : (
                                      <div
                                        className={
                                          "avatar-title rounded-circle bg-primary userprofile"
                                        }
                                      >
                                        {(getUserName(user) || "U")
                                          .charAt(0)
                                          .toUpperCase()}
                                      </div>
                                    )}
                                  </div>

                                     <span className="user-status"></span>
                                </div>
                                <div className="flex-grow-1 overflow-hidden">
                                  <p className="text-truncate mb-0 fw-semibold text-body">
                                    {getUserName(user)}
                                  </p>
                                  {(user.lastMessage ||
                                    user.Username ||
                                    user.username ||
                                    user.Email ||
                                    user.email) && (
                                    <p className="text-truncate text-muted fs-12 mb-0">
                                      {user.lastMessage ||
                                        user.Username ||
                                        user.username ||
                                        user.Email ||
                                        user.email}
                                    </p>
                                  )}
                                </div>
                                {(user.unreadCount || 0) > 0 && (
                                  <div className="flex-shrink-0">
                                    <span className="badge bg-success rounded-pill">
                                      {user.unreadCount}
                                    </span>
                                  </div>
                                )}
                                <div
   onClick={() =>
      scrollToMessage(user.messageId)
   }
>
   {user.messageId}
</div>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>

        

                    <div className="chat-message-list">
                      <ul
                        className="list-unstyled chat-list chat-user-list mb-0 users-list"
                        id="channelList"
                      >
                        {channels.map((channel, key) => (
                          <React.Fragment key={key}>
                            <li>
                              <Link to="#" className="unread-msg-user">
                                <div className="d-flex align-items-center">
                                  <div className="flex-shrink-0 chat-user-img online align-self-center me-2 ms-0">
                                    <div className="avatar-xxs">
                                      <div className="avatar-title bg-light rounded-circle text-body">
                                        #
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex-grow-1 overflow-hidden">
                                    <p className="text-truncate mb-0 fw-semibold text-body">
                                      {channel.name}
                                    </p>
                                  </div>
                                  {channel.unReadMessage && (
                                    <div className="flex-shrink-0">
                                      <span className="badge bg-dark-subtle text-body rounded p-1">
                                        {channel.unReadMessage}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </Link>
                            </li>
                          </React.Fragment>
                        ))}
                      </ul>
                    </div>
                  </SimpleBar>
                </TabPane>
                <TabPane tabId="2" id="contacts">
                  <SimpleBar
                    className="chat-room-list pt-3"
                    style={{ margin: "-16px 0px 0px" }}
                  >
                    <div className="sort-contact">
                      {(sortedGroupedContacts || []).map((item, key) => (
                        <div className="mt-3" key={key}>
                          <div className="contact-list-title">{item.title}</div>
                          <ul
                            id={"contact-sort-" + item.title}
                            className="list-unstyled contact-list"
                          >
                            {item.contacts.map((contact, idx) => (
                              <li key={contact.id || contact.UserId || idx}>
                                <div className="d-flex align-items-center">
                                  <div className="flex-shrink-0 me-2">
                                    <div className="avatar-xxs">
                                      {contact.image ? (
                                        <img
                                          src={contact.image}
                                          className="img-fluid rounded-circle"
                                          alt=""
                                        />
                                      ) : (
                                        <span className="avatar-title rounded-circle bg-primary fs-10">
                                          {(
                                            contact.FullName ||
                                            contact.full_name ||
                                            contact.firstName ||
                                            contact.name ||
                                            contact.Username ||
                                            contact.username ||
                                            "U"
                                          )
                                            .charAt(0)
                                            .toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div
                                    className="flex-grow-1"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      userChatOpen(contact);
                                      setcustomActiveTab("1");
                                    }}
                                    style={{ cursor: "pointer" }}
                                  >
                                    <p className="text-truncate contactlist-name mb-0 fw-semibold text-body">
                                      {contact.FullName ||
                                        contact.full_name ||
                                        contact.firstName ||
                                        contact.name ||
                                        "Unknown User"}
                                    </p>
                                    {(contact.Username ||
                                      contact.username ||
                                      contact.Email ||
                                      contact.email) && (
                                      <p className="text-truncate text-muted fs-12 mb-0">
                                        {contact.Username ||
                                          contact.username ||
                                          contact.Email ||
                                          contact.email}
                                      </p>
                                    )}
                                  </div>
                      
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </SimpleBar>
                </TabPane>
              </TabContent>
            </div>

            <div className="user-chat w-100 overflow-hidden" ref={userChatShow}>
              <div className="chat-content d-lg-flex">
                <div className="w-100 overflow-hidden position-relative">
                  {selectedUser ? (
                    <div className="position-relative">
                      <div className="p-3 user-chat-topbar">
                        <Row className="align-items-center">
                          <Col sm={4} xs={8}>
                            <div className="d-flex align-items-center">
                              <div className="flex-shrink-0 d-block d-lg-none me-3">
                                <Link
                                  to="#"
                                  onClick={backToUserChat}
                                  className="user-chat-remove fs-18 p-1"
                                >
                                  <i className="ri-arrow-left-s-line align-bottom"></i>
                                </Link>
                              </div>
                              <div className="flex-grow-1 overflow-hidden">
                                <div className="d-flex align-items-center">
                                  <div className="flex-shrink-0 chat-user-img online user-own-img align-self-center me-3 ms-0">
                                    {Chat_Box_Image === undefined ? (
                                      <img
                                        src={userDummayImage}
                                        className="rounded-circle avatar-xs"
                                        alt=""
                                      />
                                    ) : (
                                      <img
                                        src={Chat_Box_Image}
                                        className="rounded-circle avatar-xs"
                                        alt=""
                                      />
                                    )}
                                    <span className="user-status"></span>
                                  </div>
                                  <div className="flex-grow-1 overflow-hidden">
                                    <h5 className="text-truncate mb-0 fs-16">
                                      <a
                                        className="text-body fw-semibold username"
                                        data-bs-toggle="offcanvas"
                                        href="#userProfileCanvasExample"
                                        aria-controls="userProfileCanvasExample"
                                      >
                                        {Chat_Box_Username}
                                      </a>
                                    </h5>
                                   
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Col>
                          <Col sm={8} xs={4}>
                            <ul className="list-inline user-chat-nav text-end mb-0">
                              <li className="list-inline-item m-0">
                                <Dropdown
                                  isOpen={search_Menu}
                                  toggle={toggleSearch}
                                >
                                  <DropdownToggle
                                    className="btn btn-ghost-secondary btn-icon"
                                    tag="button"
                                  >
                                    <FeatherIcon
                                      icon="search"
                                      className="icon-sm"
                                    />
                                  </DropdownToggle>
                                  <DropdownMenu className="p-0 dropdown-menu-end dropdown-menu-lg">
                                    <div className="p-2">
                                      <div className="search-box">
                                        <Input
                                          onChange={searchMessages}
                                          type="text"
                                          className={`form-control ${isDarkMode ? "bg-dark border-dark text-white" : "bg-light border-light text-body"}`}
                                          placeholder="Search here..."
                                          id="searchMessage"
                                        />
                                        <i className="ri-search-2-line search-icon"></i>
                                      </div>
                                    </div>
                                  </DropdownMenu>
                                </Dropdown>
                              </li>

                              <li className="list-inline-item d-none d-lg-inline-block m-0">
                                <button
                                  type="button"
                                  className="btn btn-ghost-secondary btn-icon"
                                  onClick={toggleInfo}
                                >
                                  <FeatherIcon
                                    icon="info"
                                    className="icon-sm"
                                  />
                                </button>
                              </li>
                            </ul>
                          </Col>
                        </Row>
                      </div>

                      <div className="position-relative" id="users-chat">
                        <div
                          className="chat-conversation p-3 p-lg-4"
                          id="chat-conversation"
                        >
                          <PerfectScrollbar
                            containerRef={(ref) => setMessageBox(ref)}
                          >
                            <div id="elmLoader"></div>
                            <ul
                              className="list-unstyled chat-conversation-list"
                              id="users-conversation"
                            >
                              {isLoadingMessages && (
                                <div className="text-center p-4">
                                  <div
                                    className="spinner-border text-primary"
                                    role="status"
                                  >
                                    <span className="sr-only">Loading...</span>
                                  </div>
                                </div>
                              )}
                              {!isLoadingMessages &&
                                messages &&
                                messages.length === 0 && (
                                  <div className="text-center p-4 text-muted">
                                    No messages in this conversation.
                                  </div>
                                )}
                              {!isLoadingMessages &&
                                sortedMessages &&
                                sortedMessages.map((message, key) => {
                                  const prevMessage =
                                    key > 0 ? sortedMessages[key - 1] : null;
                                  const messageDate =
                                    getMessageCreatedAt(message);
                                  const prevDate =
                                    getMessageCreatedAt(prevMessage);
                                  const showDateDivider =
                                    messageDate &&
                                    (!prevDate ||
                                      !isSameCalendarDay(
                                        messageDate,
                                        prevDate,
                                      ));
                                  const messageKey =
                                    message.id ??
                                    message.messageId ??
                                    key;

                                  return (
                                    <React.Fragment key={messageKey}>
                                      {showDateDivider && (
                                        <li className="chat-day-title">
                                          <span className="title">
                                            {formatChatDayLabel(messageDate)}
                                          </span>
                                        </li>
                                      )}
                                      <li
                                        className={
                                          (message.senderId ||
                                            message.senderUserId) ===
                                          loggedInUserId
                                            ? "chat-list right"
                                            : "chat-list left"
                                        }
                                      >
                                    <div className="conversation-list">
                                      {(message.senderId ||
                                        message.senderUserId) !==
                                        loggedInUserId && (
                                        <div className="chat-avatar">
                                          {Chat_Box_Image === undefined ? (
                                            <img src={userDummayImage} alt="" />
                                          ) : (
                                            <img src={Chat_Box_Image} alt="" />
                                          )}
                                        </div>
                                      )}

                                      <div className="user-chat-content">
                                        <div className="ctext-wrap">
                                          <div className="ctext-wrap-content">
                                            {/* Quoted reply bubble — shown when this message is a reply */}
                                            {(message.replyMessageId ||
                                              message.reply_message_id) &&
                                              (() => {
                                                const refId =
                                                  message.replyMessageId ||
                                                  message.reply_message_id;
                                                const orig = messages.find(
                                                  (m) =>
                                                    (m.id || m.messageId) ===
                                                    refId,
                                                );
                                                if (!orig) return null;
                                                const isOwnOrig =
                                                  (orig.senderId ||
                                                    orig.senderUserId) ===
                                                  loggedInUserId;
                                                const origText =
                                                  orig.message ||
                                                  orig.text ||
                                                  orig.content ||
                                                  orig.messageText;
                                                return (
                                                  <div className="reply-quote-block"
                                                  
                                                  onClick={() =>
                                                    scrollToMessage(message.replyMessageId)
                                                  }
                                                  >
                                                    <span className="reply-quote-sender">
                                                      {isOwnOrig
                                                        ? 'You'
                                                        : Chat_Box_Username}
                                                    </span>
                                                    <p className="reply-quote-text mb-0">
                                                      {origText || "Attachment"}
                                                    </p>
                                                  </div>
                                                );
                                              })()}
                                            {message.messageType === "file" ? (
                                              (() => {
                                                const fileUrl =
                                                  getMessageFileUrl(message);
                                                const fileName =
                                                  getMessageText(message) ||
                                                  "Attachment";
                                                const fileType = getFileType(
                                                  message.fileLink,
                                                );

                                                if (fileType === "image") {
                                                  return (
                                                    <div>
                                                      <img
                                                        src={fileUrl}
                                                        alt="attachment"
                                                        className="image-attachment-preview"
                                                        onClick={() =>
                                                          setPreviewImage(
                                                            fileUrl,
                                                          )
                                                        }
                                                        loading="lazy"
                                                      />
                                                    </div>
                                                  );
                                                }

                                                if (fileType === "video") {
                                                  return (
                                                    <div>
                                                      <video
                                                        src={fileUrl}
                                                        className="image-attachment-preview"
                                                        controls
                                                        preload="metadata"
                                                        style={{
                                                          maxWidth: "280px",
                                                          maxHeight: "220px",
                                                          borderRadius: "8px",
                                                          display: "block",
                                                          cursor: "default",
                                                        }}
                                                      />
                                                    </div>
                                                  );
                                                }

                                                const fileInfo =
                                                  getFileIcon(fileType);
                                                return (
                                                  <a
                                                    href={fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="file-attachment-card"
                                                  >
                                                    <div
                                                      className="file-attachment-icon"
                                                      style={{
                                                        backgroundColor:
                                                          fileInfo.bg,
                                                      }}
                                                    >
                                                      <i
                                                        className={
                                                          fileInfo.icon
                                                        }
                                                      ></i>
                                                    </div>
                                                    <div className="file-attachment-info">
                                                      <span className="file-attachment-name">
                                                        {fileName}
                                                      </span>
                                                      <span className="file-attachment-size">
                                                        {fileType.toUpperCase()}
                                                      </span>
                                                    </div>
                                                    <div className="file-attachment-download">
                                                      <i className="ri-download-2-line"></i>
                                                    </div>
                                                  </a>
                                                );
                                              })()
                                            ) : (
                                              <div
  id={`message-${message.messageId}`}
  className="chat-message"
>
                                              <p
                                                className={`mb-0 ctext-content ${(message.senderId || message.senderUserId) !== loggedInUserId ? "text-body" : ""}`}
                                                style={{
                                                  color:
                                                    (message.senderId ||
                                                      message.senderUserId) ===
                                                    loggedInUserId
                                                      ? "#0ab39c"
                                                      : "",
                                                }}
                                               
                                              >
                                                {highlightText(
                                                  message.message ||
                                                    message.text ||
                                                    message.content ||
                                                    message.messageText,
                                                  searchText,
                                                )}
                                             
                                              </p>
                                              </div>
                                            )}
                                          </div>
                                          <UncontrolledDropdown className="align-self-start message-box-drop">
                                            <DropdownToggle
                                              href="#"
                                              className="btn nav-btn"
                                              tag="a"
                                            >
                                              <i className="ri-more-2-fill"></i>
                                            </DropdownToggle>
                                            <DropdownMenu>
                                              {isImageMessage(message) && (
                                                <DropdownItem
                                                  href="#"
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    handleDownloadImage(
                                                      message,
                                                    );
                                                  }}
                                                >
                                                  <i className="ri-download-2-line me-2 text-muted align-bottom"></i>
                                                  Download
                                                </DropdownItem>
                                              )}
                                              <DropdownItem
                                                href="#"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  isImageMessage(message)
                                                    ? handleCopyImage(message)
                                                    : handleCkick(e.target);
                                                }}
                                              >
                                                <i className="ri-file-copy-line me-2 text-muted align-bottom"></i>
                                                Copy
                                              </DropdownItem>
                                              <DropdownItem
                                                href="#"
                                                className="reply-message"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  setreply(message);
                                                }}
                                              >
                                                <i className="ri-reply-line me-2 text-muted align-bottom"></i>
                                                Reply
                                              </DropdownItem>
                                              {isMessageFromCurrentUser(
                                                message,
                                                loggedInUserId,
                                              ) && (
                                                <DropdownItem
                                                  href="#"
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    handleDeleteMessage(
                                                      message,
                                                    );
                                                  }}
                                                >
                                                  <i className="ri-delete-bin-5-line me-2 text-muted align-bottom"></i>
                                                  Delete
                                                </DropdownItem>
                                              )}
                                            </DropdownMenu>
                                          </UncontrolledDropdown>
                                        </div>
                                        <div className="conversation-name">
                                          <small className="text-muted time">
                                            {formatMessageTime(message)}
                                          </small>{" "}
                                          {isMessageFromCurrentUser(
                                            message,
                                            loggedInUserId,
                                          ) && renderMessageStatusIcon(message)}
                                        </div>
                                      </div>
                                    </div>
                                  </li>
                                    </React.Fragment>
                                  );
                                })}
                            </ul>
                          </PerfectScrollbar>
                        </div>
                        <div
                          className="alert alert-warning alert-dismissible copyclipboard-alert px-4 fade show "
                          id="copyClipBoard"
                          role="alert"
                        >
                          Message copied
                        </div>
                        {emojiPicker && (
                          <div className="alert pickerEmoji">
                            <Picker
                              disableSearchBar={true}
                              onEmojiClick={onEmojiClick}
                            />
                          </div>
                        )}
                      </div>

                      <div className="chat-input-section p-3 p-lg-4">
                        <form id="chatinput-form">
                          <Row className="g-0 align-items-center">
                            <div className="col-auto">
                              <div className="chat-input-links me-2">
                                <div className="links-list-item d-flex align-items-center">
                                  <button
                                    type="button"
                                    className="btn btn-link text-decoration-none emoji-btn"
                                    id="emoji-btn"
                                    onClick={() => setemojiPicker(!emojiPicker)}
                                  >
                                    <i className="bx bx-smile align-middle"></i>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-link text-decoration-none emoji-btn ms-1"
                                    onClick={handleAttachmentClick}
                                    disabled={isUploading}
                                  >
                                    <i
                                      className={
                                        isUploading
                                          ? "bx bx-loader bx-spin align-middle"
                                          : "ri-attachment-2 align-middle"
                                      }
                                    ></i>
                                  </button>
                                  <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: "none" }}
                                    onChange={handleFileUpload}
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="col">
                              <div className="chat-input-feedback">
                                Please Enter a Message
                              </div>
                              <input
                                type="text"
                                value={curMessage}
                                onKeyDown={onKeyPress}
                                onChange={(e) => setcurMessage(e.target.value)}
                                className={`form-control chat-input ${isDarkMode ? "bg-dark border-dark text-white" : "bg-light border-light text-body"}`}
                                id="chat-input"
                                placeholder="Type your message..."
                              />
                            </div>
                            <div className="col-auto">
                              <div className="chat-input-links ms-2">
                                <div className="links-list-item">
                                  <Button
                                    type="button"
                                    color="success"
                                    onClick={() => {
                                      addMessage();
                                      setemojiPicker(false);
                                      setemojiArray("");
                                    }}
                                    className="chat-send waves-effect waves-light"
                                  >
                                    <i className="ri-send-plane-2-fill align-bottom"></i>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </Row>
                        </form>
                      </div>

                      <div className={reply ? "replyCard show" : "replyCard"}>
                        <Card className="mb-0">
                          <CardBody className="py-3">
                            <div className="replymessage-block mb-0 d-flex align-items-start">
                              <div className="flex-grow-1">
                                <h5 className="conversation-name">
                                  {reply &&
                                    ((reply.senderId || reply.senderUserId) ===
                                    loggedInUserId
                                      ? 'You'
                                      : Chat_Box_Username)}
                                </h5>
                                <p className="mb-0">
                                  {reply &&
                                    (reply.message ||
                                      reply.text ||
                                      reply.content ||
                                      reply.messageText ||
                                      "Attachment")}
                                </p>
                              </div>
                              <div className="flex-shrink-0">
                                <button
                                  type="button"
                                  id="close_toggle"
                                  className="btn btn-sm btn-link mt-n2 me-n3 fs-18"
                                  onClick={() => setreply("")}
                                >
                                  <i className="bx bx-x align-middle"></i>
                                </button>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="d-flex flex-column justify-content-center align-items-center h-100"
                      style={{ minHeight: "calc(100vh - 150px)" }}
                    >
                      <div className="avatar-xl mb-4">
                        <div className="avatar-title bg-success-subtle text-success rounded-circle fs-34">
                          <i className="ri-wechat-line"></i>
                        </div>
                      </div>
                      <h4 className="text-muted mb-2">
                        Select a user to start chat
                      </h4>
                      <p
                        className="text-muted text-center"
                        style={{ maxWidth: "400px" }}
                      >
                        Click on a user from the left panel to view messages or
                        start a new conversation.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </div>
      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="image-modal-overlay"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="image-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="image-modal-close"
              onClick={() => setPreviewImage(null)}
            >
              &times;
            </button>
            <img src={previewImage} alt="Preview" />
          </div>
        </div>
      )}
      {/*<PersonalInfo
        show={isInfoDetails}
        onCloseClick={() => setIsInfoDetails(false)}
        currentuser={Chat_Box_Username}
        cuurentiseImg={Chat_Box_Image}
      /> */}
      console.log("chatAttachments state", chatAttachments);
      <PersonalInfo
        show={isInfoDetails}
        onCloseClick={() => setIsInfoDetails(false)}
        currentuser={Chat_Box_Username}
        cuurentiseImg={Chat_Box_Image}
        selectedUser={selectedUser}
        attachments={chatAttachments}
      />
      <DeleteModal
        show={deleteModal}
        onDeleteClick={confirmDeleteMessage}
        onCloseClick={() => {
          setDeleteModal(false);
          setMessageToDelete(null);
        }}
      />
      <ChatFileUpload
        showModal={showModal}
        setShowModal={setShowModal}
      />
    </React.Fragment>
  );
};

export default Chat;
