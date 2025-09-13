import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  Mail,
  Download,
  Users,
  UserPlus,
  Settings,
  ChevronLeft,
  ChevronRight,
  Upload,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  Send,
} from "lucide-react";
import { Pagination, User, UserStats } from "@/lib/types";
import EmailModal from "./EmailModal";
import Image from "next/image";

const UserManagementDashboard = () => {
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    subscribedUsers: 0,
    activeToday: 0,
    newThisWeek: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    usersPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [appName, setAppName] = useState("User Management");
  const [filterProvider, setFilterProvider] = useState("all");
  const [filterSubscription, setFilterSubscription] = useState("all");
  const [loading, setLoading] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(!configLoaded);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  // Debounced search
  const [searchDebounceTimer, setSearchDebounceTimer] =
    useState<NodeJS.Timeout | null>(null);

  // Load Firebase config from JSON file
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/json") {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const firebaseJsonConfig = JSON.parse(e.target?.result as string);
          const projectId: string | undefined = firebaseJsonConfig?.project_id;

          const rawJson = e.target?.result as string;
          const encoded = btoa(rawJson);
          await fetch("/api/firebase", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ firebaseConfig: encoded }),
          });
          const appName = (projectId || "User Management")
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
          setAppName(appName);
          setConfigLoaded(true);
          setShowConfigModal(false);
          console.log("Firebase config loaded:", encoded);
          // Automatically fetch users after config is loaded
          fetchUsers(
            1,
            pagination.usersPerPage,
            searchTerm,
            filterProvider,
            filterSubscription
          );
        } catch (error) {
          alert(
            "Invalid JSON file. Please check your Firebase service account key."
          );
        }
      };
      reader.readAsText(file);
    } else {
      alert("Please select a valid JSON file.");
    }
  };

  // Fetch users from Firebase with proper pagination
  const fetchUsers = useCallback(
    async (
      page: number = 1,
      limit: number = 10,
      search: string = "",
      provider: string = "all",
      subscription: string = "all"
    ) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(search && { search }),
          ...(provider !== "all" && { provider }),
          ...(subscription !== "all" && { subscription }),
        });

        const response = await fetch(`/api/users?${params}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
          setUserStats(
            data.stats || {
              totalUsers: 0,
              subscribedUsers: 0,
              activeToday: 0,
              newThisWeek: 0,
            }
          );
          setPagination(
            data.pagination || {
              currentPage: page,
              totalPages: 1,
              totalUsers: 0,
              usersPerPage: limit,
              hasNextPage: false,
              hasPrevPage: false,
            }
          );

          // Clear selections when fetching new data
          setSelectedUsers(new Set());

          console.log("Users loaded:", data.users?.length || 0);
        } else {
          const errorData = await response.json();
          console.error("Failed to fetch users:", errorData.message);
          alert("Failed to fetch users. Please try again.");
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        // Fallback to mock data
        const mockUsers = [
          {
            id: "1",
            displayName: "John Doe",
            email: "john@example.com",
            provider: "google",
            subscription: "premium",
            createdAt: "2024-01-15T10:30:00Z",
            lastLogin: "2024-09-13T08:45:00Z",
            photoUrl:
              "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
          },
        ];
        setUsers(mockUsers);
        setUserStats({
          totalUsers: 1,
          subscribedUsers: 1,
          activeToday: 1,
          newThisWeek: 1,
        });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Load demo data when component mounts
  useEffect(() => {
    if (!configLoaded) return;

    fetchUsers(1, 10, searchTerm, filterProvider, filterSubscription);
  }, []);

  // Handle search with debouncing
  useEffect(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    const timer = setTimeout(() => {
      if (!configLoaded) return;
      fetchUsers(
        1,
        pagination.usersPerPage,
        searchTerm,
        filterProvider,
        filterSubscription
      );
    }, 300);

    setSearchDebounceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [searchTerm, filterProvider, filterSubscription, pagination.usersPerPage]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchUsers(
        newPage,
        pagination.usersPerPage,
        searchTerm,
        filterProvider,
        filterSubscription
      );
    }
  };

  // User selection handlers
  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleAllUsers = () => {
    if (selectedUsers.size === users.length && users.length > 0) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((user) => user.id)));
    }
  };

  // Export selected users
  const exportUsers = () => {
    if (selectedUsers.size === 0) {
      alert("Please select users to export.");
      return;
    }

    const selectedUserData = users.filter((user) => selectedUsers.has(user.id));
    const dataStr = JSON.stringify(selectedUserData, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = `users_export_${
      new Date().toISOString().split("T")[0]
    }.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  // Send email to selected users
  const sendEmail = async () => {
    if (selectedUsers.size === 0 || !configLoaded) {
      alert("Please select at least one user to send email.");
      return;
    }

    const selectedEmails = users
      .filter((user) => selectedUsers.has(user.id))
      .map((user) => user.email);

    setLoading(true);
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emails: selectedEmails,
          subject: emailSubject,
          content: emailContent,
          sendToAll: false,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`${result.message}`);
        setShowEmailModal(false);
        setEmailSubject("");
        setEmailContent("");
        setSelectedUsers(new Set());
      } else {
        alert(`Failed to send emails: ${result.message}`);
      }
    } catch (error) {
      console.error("Error sending email:", error);
      alert("Error sending email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? "Invalid date"
      : date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  };

  // Get subscription badge style
  const getSubscriptionBadge = (subscription: string) => {
    if (subscription === "premium") {
      return "bg-gradient-to-r from-purple-500 to-pink-500 text-white";
    }
    return "bg-gray-100 text-gray-700";
  };

  // Generate pagination numbers
  const getPaginationNumbers = () => {
    const { currentPage, totalPages } = pagination;
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-indigo-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">{appName}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowBulkEmailModal(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Send className="h-4 w-4 mr-2" />
                Bulk Email All Users
              </button>
              <button
                onClick={() => setShowConfigModal(true)}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  configLoaded
                    ? "bg-green-100 text-green-800 border border-green-200"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                <Settings className="h-4 w-4 mr-2" />
                {configLoaded ? "Config Loaded ✓" : "Load Firebase Config"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {userStats.totalUsers.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <UserPlus className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Premium Users
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {userStats.subscribedUsers.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Active Today
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {userStats.activeToday.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <UserPlus className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  New This Week
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {userStats.newThisWeek.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filters */}
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={filterProvider}
                onChange={(e) => setFilterProvider(e.target.value)}
              >
                <option value="all">All Providers</option>
                <option value="google">Google</option>
                <option value="facebook">Facebook</option>
                <option value="email">Email</option>
              </select>

              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={filterSubscription}
                onChange={(e) => setFilterSubscription(e.target.value)}
              >
                <option value="all">All Subscriptions</option>
                <option value="premium">Premium</option>
                <option value="trial">Trial</option>
              </select>
            </div>

            {/* Action Buttons */}
            {selectedUsers.size > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email ({selectedUsers.size})
                </button>
                <button
                  onClick={exportUsers}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export ({selectedUsers.size})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="ml-3 text-gray-600">Loading users...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={toggleAllUsers}
                          className="flex items-center space-x-2 hover:text-gray-700"
                        >
                          {selectedUsers.size === users.length &&
                          users.length > 0 ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                          <span>Select</span>
                        </button>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Provider
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subscription
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          selectedUsers.has(user.id)
                            ? "bg-indigo-50 border-l-4 border-indigo-500"
                            : ""
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleUserSelection(user.id)}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            {selectedUsers.has(user.id) ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium mr-3">
                              {user.photoUrl ? (
                                <Image
                                  src={user.photoUrl}
                                  alt={user.displayName}
                                  width={40}
                                  height={40}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                user.displayName?.charAt(0).toUpperCase() || "?"
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.displayName || "No Name"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-gray-100 text-gray-800">
                            {user.provider || "Unknown"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getSubscriptionBadge(
                              user.subscription
                            )}`}
                          >
                            {user.subscription}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(user.lastLogin)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-white px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage || loading}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage || loading}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{" "}
                      <span className="font-medium">
                        {(pagination.currentPage - 1) *
                          pagination.usersPerPage +
                          1}
                      </span>{" "}
                      to{" "}
                      <span className="font-medium">
                        {Math.min(
                          pagination.currentPage * pagination.usersPerPage,
                          pagination.totalUsers
                        )}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium">
                        {pagination.totalUsers.toLocaleString()}
                      </span>{" "}
                      results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() =>
                          handlePageChange(pagination.currentPage - 1)
                        }
                        disabled={!pagination.hasPrevPage || loading}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>

                      {getPaginationNumbers().map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          disabled={loading}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            pagination.currentPage === pageNum
                              ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          } ${loading ? "cursor-not-allowed opacity-50" : ""}`}
                        >
                          {pageNum}
                        </button>
                      ))}

                      <button
                        onClick={() =>
                          handlePageChange(pagination.currentPage + 1)
                        }
                        disabled={!pagination.hasNextPage || loading}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Firebase Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Load Firebase Configuration
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload your Firebase service account JSON file to connect to your
              project.
            </p>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfigModal(false);
                  if (!configLoaded) return;
                  fetchUsers(
                    1,
                    pagination.usersPerPage,
                    searchTerm,
                    filterProvider,
                    filterSubscription
                  );
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Use Demo Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw max-h-90vh overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Send Email to {selectedUsers.size} Selected Users
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <textarea
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder="Enter email content (plain text)"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={sendEmail}
                disabled={!emailSubject || !emailContent || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Email Modal */}
      {/* Email Modal */}
      {showBulkEmailModal && (
        <EmailModal
          onClose={() => setShowBulkEmailModal(false)}
          onSend={() => {
            setShowBulkEmailModal(false);
            // Optionally show success message
          }}
        />
      )}
    </div>
  );
};

export default UserManagementDashboard;
