import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, X, Clock, Loader2  } from "lucide-react";
import {fetchMyNewsPosts,fetchDistributedNews,publishNewsArticle,fetchNewsDetail,fetchMasterCategories,fetchPortals,
  fetchPortalCategories,editNews,deleteDistributedNews,updateDistributedNews,fetchDistributedNewsDetail, backgroundPublishNews} from "../../server";
import constant from "../../Constant";
import { toast } from "react-toastify";
import MasterFilter from "../components/filters/MasterFilter";
import SearchFilter from "../components/filters/SearchFilter";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const NewsList = () => {
  const navigate = useNavigate();
  const [selectedNewsIds, setSelectedNewsIds] = useState([]);
  const [selectedResponse, setSelectedResponse] = useState(null);

  const [news, setNews] = useState([]);
  const [selectedNews, setSelectedNews] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10); // default 10 items per page
  const [distributedList, setDistributedList] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [distributedData, setDistributedData] = useState({});
  const [publishingId, setPublishingId] = useState(null);
  const [distributionStatus, setDistributionStatus] = useState("");
  const [counts, setCounts] = useState({
    total_master_news_posts: 0,
    total_news_distributions: 0,
  });
  // console.log(counts)
  // 🔹 Filter States
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [username, setUsername] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPortal, setSelectedPortal] = useState("");
  const [selectedPortalCategory, setSelectedPortalCategory] = useState("");
  const [selectedMasterCategory, setSelectedMasterCategory] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
const [isLoadingNews, setIsLoadingNews] = useState(false);
const [loadingDistributed, setLoadingDistributed] = useState({}); 
  // 🔹 Dropdown Data
  const [portals, setPortals] = useState([]);
  const [portalCategories, setPortalCategories] = useState([]);
  const [masterCategories, setMasterCategories] = useState([]);
  const [showRetryWarning, setShowRetryWarning] = useState(false);
  const [pendingRetryItem, setPendingRetryItem] = useState(null);

  const handleExportToExcel = () => {
    if (!news || news.length === 0) {
      toast.warn("No news data to export!");
      return;
    }

    // Prepare data
    const exportData = news.map((item, index) => ({
      "Sr No": index + 1,
      Headline: item.headline,
      Category: item.category,
      Status: item.status,
      Date: item.date,
      Author: item.author,
      "Short Description": item.shortDesc,
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "News");

    // Convert to Excel file
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Trigger download
    saveAs(blob, `news_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // 🔹 Load dropdowns
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [mastersRes, portalsRes] = await Promise.all([
          fetchMasterCategories(),
          fetchPortals(),
        ]);
        setMasterCategories(mastersRes?.data?.data || []);
        setPortals(portalsRes?.data?.data || []);
      } catch (err) {
        console.error("Failed to load dropdowns:", err);
      }
    };
    loadDropdowns();
  }, []);

  const loadDistributedNews = async (newsPostId) => {
    setLoadingDistributed((prev) => ({ ...prev, [newsPostId]: true }));
    try {
      const res = await fetchDistributedNews({ news_post_id: newsPostId });
      if (res?.data?.status) {
        setDistributedData((prev) => ({
          ...prev,
          [newsPostId]: res.data.data || [],
        }));
      } else {
        setDistributedData((prev) => ({ ...prev, [newsPostId]: [] }));
      }
    } catch (err) {
      console.error("Failed to fetch distributed list:", err);
      setDistributedData((prev) => ({ ...prev, [newsPostId]: [] }));
    }
     finally {
    setLoadingDistributed((prev) => ({ ...prev, [newsPostId]: false })); // ✅ ADD THIS
  }
  };

  const handleRetryPublish = async (item) => {
    try {
      setPublishingId(item.id);
      const res = await publishNewsArticle(item.id);

      if (res?.data?.status) {
        toast.success("Article republished successfully!");

        // ✅ Always reload the distribution immediately after retry
        await loadDistributedNews(item.id);

        if (expandedRow === item.id) {
          setTimeout(() => {
            loadDistributedNews(item.id);
          }, 1000); 
        }
      } else {
        toast.error("Failed to republish the article.");
      }
    } catch (err) {
      console.error("❌ Error while republishing:", err);
      toast.error("Something went wrong while republishing.");
    } finally {

      setPublishingId(null);
    }
  };

  const handleBackgroundRetry = async (item) => {
  try {
    setPublishingId(item.id);
    const res = await backgroundPublishNews(item.id);

    if (res?.data?.status) {
      toast.success("News queued successfully! Publishing in background.");
    } else {
      toast.error(res?.data?.message || "Failed to queue background publish.");
    }
  } catch (err) {
    console.error("Background retry error:", err);
    toast.error("Failed to queue background publish.");
  } finally {
    setPublishingId(null);
  }
};


 useEffect(() => {
  if (!expandedRow) return; 
  if (dateFilter !== "today") return; // ✅ If dateFilter is NOT "today", stop here (no refresh)

  const interval = setInterval(() => {
    console.log(`⏳ Auto-refreshing distribution for news ID: ${expandedRow}`);
    loadDistributedNews(expandedRow);
  }, 15000);

  return () => clearInterval(interval); 
}, [expandedRow, dateFilter]);


  useEffect(() => {
    const loadPortalCats = async () => {
      if (!selectedPortal) {
        setPortalCategories([]);
        return;
      }
      try {
        const res = await fetchPortalCategories(selectedPortal);
        setPortalCategories(res?.data?.data || []);
      } catch (err) {
        console.error("Failed to load portal categories:", err);
      }
    };
    loadPortalCats();
  }, [selectedPortal]);

  const loadNewsWithFilters = async (filters) => {
    setIsRefreshing(true);
     setIsLoadingNews(true);

    try {
      let date_filter = "";
      let start_date = "";
      let end_date = "";

      const df = filters.date_filter;

      if (typeof df === "string") {
      // ✅ ADD THIS CONDITION
      if (df === "All") {
        date_filter = "custom";
        start_date = "2024-01-01";
        end_date = new Date().toISOString().split('T')[0];
      } else {
        date_filter = df;
      }
    } else if (typeof df === "object" && df !== null) {
      date_filter = df.date_filter || "custom";
      start_date = df.start_date || "";
      end_date = df.end_date || "";
    }
      const res = await fetchMyNewsPosts({
        search: filters.search || "",
        status: filters.status || "",
        distribution_status: filters.distribution_status || "",
        portal: filters.portal_id || "",
        master_category: filters.master_category_id || "",
        created_by: filters.username || "",
        username: filters.username || "",
        date_filter, // ✅ fixed
        start_date,
        end_date,
        page: filters.page || page || 1,
        page_size: filters.page_size || pageSize, // ✅ Added line
      });

      if (res?.data?.status) {
        const posts = res?.data?.data.results || [];
        const countsData = res?.data?.data.counts || {};
        setCounts(countsData);

        const mapped = posts.map((item) => ({
          id: item.id,
          category: item.master_category_name || "N/A",
          headline: item.title || "Untitled",
          shortDesc: item.short_description || "",
          longDesc: item.content ? item.content.replace(/<[^>]+>/g, "") : "",
          author: "You",
          live_url: "",
          created_by_name: item.created_by_name || "N/A",
          date: new Date(item.created_at).toLocaleDateString(),
          image: item.post_image
            ? `${constant?.appBaseUrl}/${item.post_image}`
            : "https://via.placeholder.com/150",
        }));

        setNews(mapped);
        setTotalPages(res?.data?.pagination?.total_pages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch filtered news:", err);
    } finally {
      setIsRefreshing(false);
        setIsLoadingNews(false); 
    }
  };

  // 🔹 Selection
  const toggleSelect = (id) =>
    setSelectedNewsIds((prev) =>
      prev.includes(id) ? prev.filter((nid) => nid !== id) : [...prev, id]
    );

  const toggleSelectAll = () =>
    setSelectedNewsIds(
      selectedNewsIds.length === news.length ? [] : news.map((n) => n.id)
    );

  // 🔹 Reset filters
  const handleReset = () => {
    setSearch("");
    setStatus("");
    setDistributionStatus("");
    setSelectedPortal("");
    setSelectedPortalCategory("");
    setSelectedMasterCategory("");
    setStartDate("");
    setEndDate("");
    setCreatedBy("");
    setDateFilter("today");
    loadNewsWithFilters();
  };
  {
    isRefreshing && (
      <div className="text-xs text-gray-500 text-center py-1">
        Refreshing data...
      </div>
    );
  }

 // NewsList.jsx - Add this function before the return statement
const handleDeleteDistributedNews = async (distId, newsPostId) => {
  try {
    const res = await deleteDistributedNews(distId);
    
    if (res?.data?.status) {
      toast.success(res.data.message || "Distributed news deleted successfully.");
      
      // Reload the distributed news for this item
      await loadDistributedNews(newsPostId);
    } else {
      toast.error(res?.data?.message || "Failed to delete distributed news.");
    }
  } catch (err) {
    console.error("❌ Error deleting distributed news:", err);
    
    // Show user-friendly error message
    const errorMsg = err?.response?.data?.message || 
                     "Something went wrong while deleting. Please try again.";
    toast.error(errorMsg);
  }
};

  useEffect(() => {
    loadNewsWithFilters({
      page: 1,
      page_size: pageSize,
      search,
      status,
      distribution_status: distributionStatus,
      portal_id: selectedPortal,
      master_category_id: selectedMasterCategory,
      username: createdBy,
      date_filter: dateFilter,
      start_date: startDate,
      end_date: endDate,
    });
  }, [pageSize]);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-black px-6 py-4 flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center space-x-3">
              <div className="bg-white/10 p-2 rounded">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">
                  My Generated Articles / News
                </h1>
                <p className="text-gray-300 text-sm">
                  View and manage your own published & draft articles
                </p>
              </div>
            </div>

            {/* Right Section - Create News Button */}
            <button
              onClick={() => {
                navigate("/create-news")
              }}
              className="group relative p-3 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-all flex items-center space-x-2 border border-white/20"
            >
              <span className="relative z-10 flex items-center">
                <FileText className="w-4 h-4 mr-2 group-hover:animate-pulse" />
                Create News
              </span>
              <div className="absolute inset-0 rounded-lg  opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300"></div>
            </button>
            <button
              onClick={handleExportToExcel}
              className="group relative p-3 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-all flex items-center space-x-2 border border-white/20"
            >
              <FileText className="w-4 h-4 mr-2" />
              Export to Excel
            </button>
          </div>

          {/* 🔍 Standalone Search Bar */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <SearchFilter
              onChange={(query) => {
                setSearch(query);
                const filters = {
                  search: query,
                  status,
                  portal_id: selectedPortal,
                  master_category_id: selectedMasterCategory,
                  username: createdBy,
                };
                loadNewsWithFilters(filters);
              }}
            />
          </div>

          {/* Filters */}
          <div className="p-6">
            <MasterFilter
              visibleFilters={[
                // "search",
                "status",
                "distribution_status",
                "portal_id",
                "master_category_id",
                // "custom_date",
                "username",
                "date_filter",
              ]}
              initialFilters={{
                search,
                status,
                distribution_status: distributionStatus,
                portal_id: selectedPortal,
                master_category_id: selectedMasterCategory,
                username: createdBy,
                date_filter: dateFilter,
                start_date: startDate,
                end_date: endDate,
              }}
              onChange={(filters) => {
                setSearch(filters.search || "");
                setStatus(filters.status || "");
                setSelectedPortal(filters.portal_id || "");
                setSelectedMasterCategory(filters.master_category_id || "");
                setCreatedBy(filters.username || "");
                setUsername(filters.username || "");
               if (filters.date_filter === "All") {
                  setDateFilter("All");
                  const today = new Date().toISOString().split('T')[0];
                  setStartDate("2024-01-01");
                  setEndDate(today);
                } else if (typeof filters.date_filter === "object") {
                  setDateFilter(filters.date_filter?.date_filter || "custom");
                  setStartDate(filters.date_filter?.start_date || "");
                  setEndDate(filters.date_filter?.end_date || "");
                } else {
                  setDateFilter(filters.date_filter || "today");
                  setStartDate("");
                  setEndDate("");
                }
                setDistributionStatus(filters.distribution_status || "");
                setPage(1);

                // ✅ Call loadNews AFTER states update (using callback pattern)
                setTimeout(() => {
                  loadNewsWithFilters(filters);
                }, 0);
              }}
              onClear={() => {
                handleReset();
              }}
            />
            {/* 🔹 Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mb-6 mt-2">
              <div className="flex items-center justify-between bg-black border border-blue-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
                <div>
                  <h3 className="text-sm text-white font-medium">
                    Total Master Posts
                  </h3>
                  <p className="text-2xl font-bold text-white mt-1">
                    {counts?.total_master_news_posts || 0}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-full">
                  <FileText className="w-5 h-5 text-black" />
                </div>
              </div>

              <div className="flex items-center justify-between bg-black border border-green-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200">
                <div>
                  <h3 className="text-sm text-white font-medium">
                    Total Distributions
                  </h3>
                  <p className="text-2xl font-bold text-white mt-1">
                    {counts?.total_news_distributions || 0}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-full">
                  <Clock className="w-5 h-5 text-black" />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto mt-4">
            {isLoadingNews ? ( // ✅ ADD THIS CONDITION
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <Loader2 className="w-12 h-12 text-black animate-spin" />
      <p className="text-gray-600 text-sm font-medium">Loading news articles...</p>
    </div>
  ) : (
              <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-100 text-center">
                  <tr>
                    <th className="px-4 py-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-black"
                        checked={selectedNewsIds.length === news.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold text-gray-700">
                      Image
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold text-gray-700">
                      Headline
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold text-gray-700">
                      Category
                    </th>
                    {/*<th className="px-4 py-2 text-xs font-semibold text-gray-700">
                      Portal
                    </th>*/}
                    {/* <th className="px-4 py-2 text-xs font-semibold text-gray-700">
                      Live URL
                    </th> */}
                    <th className="px-4 py-2 text-xs font-semibold text-gray-700">
                      Created by
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold text-gray-700">
                      Date
                    </th>
                    <th className="px-4 py-2 text-xs font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {news.length > 0 ? (
                    news.map((item) => (
                      <React.Fragment key={item.id}>
                        {/* MAIN ROW */}
                        <tr
                          onClick={() => {
                            const isOpen = expandedRow === item.id;
                            setExpandedRow(isOpen ? null : item.id);
                            if (!isOpen) {
                              loadDistributedNews(item.id);
                            }
                          }}
                          className={`border-t hover:bg-gray-50 cursor-pointer transition-colors ${
                            expandedRow === item.id ? "bg-gray-50" : ""
                          }`}
                        >
                          <td className="px-4 py-2 text-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-black"
                              checked={selectedNewsIds.includes(item.id)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => toggleSelect(item.id)}
                            />
                          </td>
                          <td className="px-4 py-2 text-center flex justify-center">
                            <img
                              src={item.image}
                              alt={item.headline}
                              className="w-16 h-12 object-cover rounded border"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900 max-w-[140px]">
                            <div className="flex items-center gap-2">
                              <span
                                className={`transition-transform ${
                                  expandedRow === item.id ? "rotate-90" : ""
                                }`}
                              >
                                ▶
                              </span>
                              {item.headline}
                            </div>
                            <p className="text-xs text-gray-500">
                              {item.shortDesc
                                ?.split(" ")
                                .slice(0, 15)
                                .join(" ") +
                                (item.shortDesc?.split(" ").length > 15
                                  ? "..."
                                  : "")}
                            </p>
                            {/* <div className="flex items-center justify-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{item.date}</span>
                            </div> */}
                          </td>
                          <td className="px-4 py-2 text-sm text-center text-gray-700">
                            {item.category}
                          </td>
                          {/* <td className="px-4 py-2 text-sm text-gray-700">{item.author}</td> */}
                          {/* <td className="px-4 py-2 text-sm text-gray-700 truncate max-w-[180px]">
                            {item.live_url}
                          </td> */}
                          <td className="px-4 py-2 text-center">
                            <span>
                              {item.created_by_name}
                            </span>
                          </td>
                          <td className="px-4 py-2  text-center text-sm text-gray-600">
                            <div className="flex items-center justify-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{item.date}</span>
                            </div>
                            
                          </td>
                          
                          <td className="px-4 py-2 text-sm text-center">
                            {publishingId === item.id ? (
                              <div className="flex items-center justify-center gap-2 text-gray-600 text-sm">
                                <svg
                                  className="w-4 h-4 animate-spin text-gray-600"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4zm2 5a8 8 0 008 8v-4a4 4 0 01-4-4H6z"
                                  ></path>
                                </svg>
                                <span>Publishing...</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!publishingId) {
                                      setPendingRetryItem(item); // Save the item to retry later
                                      setShowRetryWarning(true);  // Open the modal
                                    }
                                  }}
                                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                  title="Retry Publish (normal)"
                                >
                                  Retry
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!publishingId) handleBackgroundRetry(item);
                                  }}
                                  className="text-sm text-emerald-600 hover:text-emerald-800 font-medium"
                                  title="Retry Publish in Background"
                                >
                                  BG Retry
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* COLLAPSIBLE DISTRIBUTED LIST */}
                        {expandedRow === item.id && (
                          <tr className="bg-white border-t border-gray-200">
                            <td colSpan="9" className="p-0">
                              {loadingDistributed[item.id] ? ( // ✅ ADD THIS CONDITION
                                <div className="flex flex-col items-center justify-center py-12 space-y-3 bg-gray-50">
                                  <Loader2 className="w-10 h-10 text-black animate-spin" />
                                  <p className="text-gray-600 text-sm font-medium">Loading distributed news...</p>
                                </div>
                              ) : distributedData[item.id]?.length > 0 ? (
                                <table className="w-full text-sm bg-gray-50">
                                  {/* ✅ Table Header */}
                                  <thead className="bg-gray-100 text-gray-700 text-xs uppercase tracking-wide border-b">
                                    <tr>
                                      <th className="w-[100px] px-3 py-2 text-left"></th>
                                      <th className="px-3 py-2 text-left">
                                        Image
                                      </th>
                                      <th className="px-3 py-2 text-left">
                                        Title
                                      </th>
                                      <th className="px-3 py-2 text-left">
                                        Portal / URL
                                      </th>
                                      <th className="px-3 py-2 text-left">
                                        Retries
                                      </th>
                                      <th className="px-3 py-2 text-left">
                                        Time Taken
                                      </th>
                                      <th className="px-3 py-2 text-left">
                                        Status
                                      </th>
                                      {/* <th className="px-3 py-2 text-left">Date</th> */}
                                      <th className="px-3 py-2 text-left">
                                        Response
                                        <br />
                                        Messages
                                      </th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {distributedData[item.id].map((dist) => (
                                      <tr
                                        key={dist.id}
                                        className="border-t border-gray-200 hover:bg-gray-100 transition-colors"
                                      >
                                        <td className="w-[100px]"></td>

                                        {/* 🔹 Portal Image */}
                                        <td className="w-[60px] px-2 py-3">
                                          <img
                                            src={dist.news_post_image}
                                            alt={dist.portal_name}
                                            className="w-10 h-10 object-cover rounded-md border"
                                          />
                                        </td>

                                        {/* 🔹 Headline + Short Description */}
                                        <td className="px-2 py-3 max-w-[220px]">
                                          <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-gray-900">
                                               {dist.ai_title ? dist.ai_title : dist.news_post_title}
                                            </span>
                                            <span className="text-xs text-gray-500 truncate max-w-[200px]">
                                              {dist.ai_short_description || "—"}
                                            </span>
                                            <span className="text-xs text-gray-500 truncate max-w-[200px]">
                                              {new Date(
                                                dist.sent_at
                                              ).toLocaleString()}
                                            </span>
                                          </div>
                                        </td>

                                        {/* 🔹 Portal + Live URL */}
                                        <td className="px-2 py-3 text-gray-600 truncate max-w-[200px]">
                                          {/* 🔹 Live URL */}
                                          {/* <a
                                              href={dist.live_url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:underline"
                                            >
                                              {dist.live_url || "—"}
                                              </a>
                                              
                                              <br /> */}
                                          <span
                                            onClick={() => {
                                              if (dist.live_url) {
                                                window.open(
                                                  dist.live_url,
                                                  "_blank"
                                                );
                                              }
                                            }}
                                            className="px-2 font-medium text-gray-800 cursor-pointer hover:text-blue-600 hover:underline transition-all"
                                            title={`Go to ${dist.portal_name} -> ${dist.live_url}`}
                                          >
                                            {dist.portal_name}
                                          </span>
                                        </td>

                                        {/* 🔹 Retry Count */}
                                        <td className="px-2 py-3 text-center text-sm font-medium">
                                          <span
                                            className={
                                              dist.retry_count > 0
                                                ? "text-red-600"
                                                : "text-green-600"
                                            }
                                          >
                                            {dist.retry_count}
                                          </span>
                                        </td>

                                        {/* 🔹 Time Taken */}
                                        <td className="px-2 py-3 text-center text-sm text-gray-700">
                                          {dist.time_taken
                                            ? `${dist.time_taken.toFixed(2)}s`
                                            : "0s"}
                                        </td>

                                        {/* 🔹 Status Badge */}
                                        <td className="px-2 py-3">
                                          <span
                                            className={`px-2 py-1 text-xs rounded ${
                                              dist.status === "SUCCESS"
                                                ? "bg-green-100 text-green-700"
                                                : dist.status === "FAILED"
                                                ? "bg-red-100 text-red-700"
                                                : "bg-yellow-100 text-yellow-700"
                                            }`}
                                          >
                                            {dist.status}
                                          </span>
                                        </td>
                                        <td className="px-2 py-3 text-center text-sm text-gray-700">
                                          {dist.response_message ? (
                                            <button
                                              onClick={() =>
                                                setSelectedResponse(
                                                  dist.response_message
                                                )
                                              }
                                              className="text-blue-600 hover:text-blue-800 underline text-xs font-medium"
                                              title="View full response message"
                                            >
                                              Check Message
                                            </button>
                                          ) : (
                                            <span className="text-gray-400 text-xs">
                                              —
                                            </span>
                                          )}
                                        </td>

                                      <td className="px-2 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          {/* Edit Button */}
                                         {(dist.status || "").toString().trim().toUpperCase() == "SUCCESS" && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/create-news?dist_id=${dist.id}`);
                                                  }}
                                                  className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                                                  title="Edit Distributed News"
                                                >
                                                  Edit
                                                </button>
                                              )}

                                          {/* Delete Button */}
                                          <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteDistributedNews(dist.id, item.id);
                                        }}
                                        className="text-sm text-red-600 hover:text-red-800 font-medium"
                                        title="Delete Distributed News"
                                      >
                                        Delete
                                      </button>
                                        </div>
                                      </td>
                                        {/* 🔹 Date */}
                                        {/* <td className="px-2 py-3 text-center text-gray-500 whitespace-nowrap">
                                          </td> */}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="text-center py-3 text-gray-500">
                                  No distribution data found.
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="9"
                        className="text-center py-4 text-gray-500"
                      >
                        No news found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              )}
              {/* {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-4">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      page === 1
                        ? "bg-gray-200 text-gray-400"
                        : "bg-black text-white hover:bg-gray-800"
                    }`}
                  >
                    Prev
                  </button>

                  <span className="text-sm text-gray-700">
                    Page {page} of {totalPages}
                  </span>

                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      page === totalPages
                        ? "bg-gray-200 text-gray-400"
                        : "bg-black text-white hover:bg-gray-800"
                    }`}
                  >
                    Next
                  </button>
                </div>
              )} */}
              {totalPages > 1 && (
                <div className="flex flex-wrap justify-center items-center space-x-3 mt-4">
                  {/* 🔹 Rows per page dropdown */}
                  <div className="flex items-center space-x-2">
                    <label htmlFor="pageSize" className="text-sm text-gray-600">
                      Show:
                    </label>
                    <select
                      id="pageSize"
                      value={pageSize}
                      onChange={(e) => {
                        const newSize = Number(e.target.value);
                        localStorage.setItem("pageSize", newSize);
                        setPageSize(newSize);
                        setPage(1);

                        // ✅ Always send normalized filter values
                        const filters = {
                          page: 1,
                          page_size: newSize,
                          search: search || "",
                          status: status || "",
                          distribution_status: distributionStatus || "",
                          portal_id: selectedPortal || "",
                          master_category_id: selectedMasterCategory || "",
                          username: createdBy || "",
                           date_filter: dateFilter === "All" 
                                ? { 
                                    date_filter: "custom", 
                                    start_date: "2024-01-01", 
                                    end_date: new Date().toISOString().split('T')[0] 
                                  }
                                : typeof dateFilter === "object"
                                ? dateFilter
                                : dateFilter || "today",
                              start_date: startDate || "",
                              end_date: endDate || "",
                            };

                            loadNewsWithFilters(filters);
                          }}

                      className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>

                    <span className="text-sm text-gray-600">per page</span>
                  </div>

                  {/* 🔹 Pagination buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        if (page > 1) {
                          const newPage = page - 1;
                          setPage(newPage);
                          loadNewsWithFilters({
                            page: newPage,
                            page_size: pageSize,
                            search,
                            status,
                            distribution_status: distributionStatus,
                            portal_id: selectedPortal,
                            master_category_id: selectedMasterCategory,
                            username: createdBy,
                            date_filter: dateFilter,
                            start_date: startDate,
                            end_date: endDate,
                          });
                        }
                      }}
                      disabled={page === 1}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        page === 1
                          ? "bg-gray-200 text-gray-400"
                          : "bg-black text-white hover:bg-gray-800"
                      }`}
                    >
                      Prev
                    </button>

                    <span className="text-sm text-gray-700">
                      Page {page} of {totalPages}
                    </span>

                    <button
                      onClick={() => {
                        if (page < totalPages) {
                          const newPage = page + 1;
                          setPage(newPage);
                          loadNewsWithFilters({
                            page: newPage,
                            page_size: pageSize,
                            search,
                            status,
                            distribution_status: distributionStatus,
                            portal_id: selectedPortal,
                            master_category_id: selectedMasterCategory,
                            username: createdBy,
                            date_filter: dateFilter,
                            start_date: startDate,
                            end_date: endDate,
                          });
                        }
                      }}
                      disabled={page === totalPages}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        page === totalPages
                          ? "bg-gray-200 text-gray-400"
                          : "bg-black text-white hover:bg-gray-800"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedNews && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setSelectedNews(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black"
            >
              <X className="w-6 h-6" />
            </button>
            {selectedNews.image && (
              <img
                src={selectedNews.image}
                alt={selectedNews.headline}
                className="w-full h-72 object-cover rounded-xl mb-6"
              />
            )}
            <h2 className="text-3xl font-bold mb-2 text-gray-900">
              {selectedNews.headline}
            </h2>
            <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-6">
              <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                {selectedNews.category}
              </span>
              <span>{selectedNews.status}</span>
              <span>✍️ {selectedNews.author}</span>
              {selectedNews.journalist && (
                <span>📰 {selectedNews.journalist}</span>
              )}
              <span>📅 {selectedNews.date}</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Summary</h3>
            <p className="mb-6 text-gray-700">{selectedNews.shortDesc}</p>
            <h3 className="text-lg font-semibold mb-2">Full Article</h3>
            <p className="text-gray-700 whitespace-pre-line">
              {selectedNews.longDesc}
            </p>
          </div>
        </div>
      )}

      {/* 📨 Response Message Modal */}
      {selectedResponse && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[90%] max-w-lg p-6 relative">
            <button
              onClick={() => setSelectedResponse(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Full Response Message
            </h3>
            <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
              {selectedResponse}
            </div>
          </div>
        </div>
      )}
      {showRetryWarning && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-center mb-4 text-amber-500">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
                Background Retry Recommended
              </h3>
              
              <p className="text-gray-600 text-center text-sm mb-6">
                This is not the recommended way to retry publishing. Please use <strong>BG Retry</strong> for better reliability. Use this method only if BG Retry is not working.
              </p>

              <div className="flex flex-col gap-3">
                {/* RED BUTTON: FORCED ACTION */}
                <button
                  onClick={() => {
                    if (pendingRetryItem) {
                      handleRetryPublish(pendingRetryItem);
                    }
                    setShowRetryWarning(false);
                    setPendingRetryItem(null);
                  }}
                  className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-md"
                >
                  Retry anyway with this method
                </button>
                
                {/* LIGHT GREEN BUTTON: SAFE ACTION */}
                <button
                  onClick={() => {
                    setShowRetryWarning(false);
                    setPendingRetryItem(null);
                  }}
                  className="w-full py-3 bg-green-100 text-green-700 rounded-lg font-semibold hover:bg-green-200 border border-green-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default NewsList;
