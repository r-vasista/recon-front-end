import React, { useState, useEffect } from "react";
import {Upload,X,Plus,Calendar,Eye,Save,RefreshCw,Image as ImageIcon,Tag,FileText,Settings,Clock,TrendingUp,AlertCircle,Star,Crop,RotateCw,ZoomIn,Maximize2,SaveAll,} from "lucide-react";
import Cropper from "react-easy-crop";
import { CKEditor } from "ckeditor4-react";
import {createNewsArticle,publishNewsArticle,fetchAllTags,updateDistributedNews,uploadMultipleImages,fetchDistributedNewsDetail,fetchPortalParentCategories,fetchCrossPortalMappings,fetchDraftNews,updateDraftNews,fetchPortals,fetchUserPortalsByUserId,fetchSubCategoriesByParent,
} from "../../server";
import constant from "../../Constant";
import { toast } from "react-toastify";
import webpfy from "webpfy";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import "../css/InputCursorFix.css";

const NewsArticleForm = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [formData, setFormData] = useState({
    headline: "",
    title: "",
    master_category: "",
    excluded_portals: [],
    shortDesc: "",
    longDesc: "",
    image: null,
    tags: [],
    latestNews: true,
    headlines: false,
    articles: false,
    trending: false,
    breakingNews: false,
    upcomingEvents: false,
    eventStartDate: "",
    eventEndDate: "",
    scheduleDate: "",
    counter: 0,
    order: 0,
    status: "PUBLISHED",
    meta_title: "",
    slug: "",
    slugEdited: false,
  });
  const [portalLoading, setPortalLoading] = useState(false);
  const [isCrossMappingChecked, setIsCrossMappingChecked] = useState(false);
  const [cropPreview, setCropPreview] = useState(null);

   const [isPublished, setIsPublished] = useState(false);
   const [activePortalForCrop, setActivePortalForCrop] = useState(null);
   const [originalDraft, setOriginalDraft] = useState(null);
  const [isCategoryloading, setIsCategoryloading] = useState(true);
  const [availableTags, setAvailableTags] = useState([]);
  const [isTagsLoading, setIsTagsLoading] = useState(true);
  const [tagInput, setTagInput] = useState("");
  const [showPortalCategoryModal, setShowPortalCategoryModal] = useState(false);
  const [portalList, setPortalList] = useState([]);
  const [portalCategoriesModal, setPortalCategoriesModal] = useState([]);
  const [selectedPortalForCategories, setSelectedPortalForCategories] = useState("");
  const [portalPage, setPortalPage] = useState(1);
  const [categoryPage, setCategoryPage] = useState(1);
  const [hasNextCategoryPage, setHasNextCategoryPage] = useState(false);
  const [imagePreview, setImagePreview] = useState(
    formData.image ? `${constant.appBaseUrl}${formData?.image}` : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState(16 / 9);
  const [assignedCategories, setAssignedCategories] = useState([]);
  const [nextCategoryPage, setNextCategoryPage] = useState(null);
  const [isLoadingMoreCategories, setIsLoadingMoreCategories] = useState(false);
  const [mappedPortals, setMappedPortals] = useState([]);
  const [showPortalSection, setShowPortalSection] = useState(false);
  const [nextPage, setNextPage] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [forceEnablePortal, setForceEnablePortal] = useState(false);
  const categoryDisabled = !!formData.master_category;
  const [isPortalsLoading, setIsPortalsLoading] = useState(false);
  const authUser = JSON.parse(localStorage.getItem("auth_user"));
  const userId = authUser?.id || null;
  const [categoryHistory, setCategoryHistory] = useState([]);
  const [isSubcategoryView, setIsSubcategoryView] = useState(false);
  const [selectedParentCategory, setSelectedParentCategory] = useState(null);
  const [isViewingSubcategories, setIsViewingSubcategories] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const tagInputRef = React.useRef(null);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showPublishWarning, setShowPublishWarning] = useState(false);

      // Add this inside the component
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const distId = queryParams.get("dist_id");
    const [isDistributedEdit, setIsDistributedEdit] = useState(false);
    const [distributedNewsId, setDistributedNewsId] = useState(null);
    const [portalImages, setPortalImages] = useState({}); 
    const [portalImagePreviews, setPortalImagePreviews] = useState({}); 
    const [showPortalImageUpload, setShowPortalImageUpload] = useState(false);
    const canUploadImages = !isPublished && isCrossMappingChecked && mappedPortals.some(p => p.mapping_found === true);
  const filteredTags = availableTags.filter((tag) => {
    const matchesSearch = tag.name
      .toLowerCase()
      .includes(tagSearchQuery.toLowerCase());
    const notSelected = !formData.tags.includes(tag.name);
    return matchesSearch && notSelected;
  });
  useEffect(() => {
    if (!formData.master_category) {
      setShowPortalSection(false);
    }
  }, [formData.master_category]);

  useEffect(() => {
    if (showPortalCategoryModal) {
      fetchPortals(portalPage).then((res) => {
        const allPortals = res?.data?.data || [];
        // Filter out the currently selected portal
        const filteredPortals = allPortals.filter(
          (portal) => portal.id !== Number(formData.master_category)
        );
        setPortalList(filteredPortals);
      });
    }
  }, [showPortalCategoryModal, portalPage]);

  useEffect(() => {
    if (selectedPortalForCategories && categoryPage === 1) {
      fetchPortalParentCategories(
        selectedPortalForCategories,
        categoryPage
      ).then((res) => {
        console.log("Fetched categories:", res?.data?.data?.parent_categories);
        const categories = res?.data?.data?.parent_categories || [];
        setPortalCategoriesModal(categories);
        setHasNextCategoryPage(!!res?.data?.pagination?.next);
      });
    }
  }, [selectedPortalForCategories, categoryPage]);

  useEffect(() => {
    if (isEditMode) {
      console.log("🟣 Edit mode enabled for ID:", id);
    } else {
      console.log("🟢 Create mode active");
    }
  }, [isEditMode, id]);

  // Add this useEffect to load distributed news data
useEffect(() => {
  const loadDistributedNewsData = async () => {
    if (distId) {
      try {
        setIsLoading(false);  
        const res = await fetchDistributedNewsDetail(distId);
        
        if (res?.data?.status) {
          const dist = res.data.data;
          
          setIsDistributedEdit(true);
          setDistributedNewsId(distId);
          
         const nd = res.data.data.portal_response;

            setFormData({
              headline: nd.post_title || "",
              title: nd.post_title || "",
              shortDesc: nd.post_short_des || "",
              longDesc: nd.post_des || "",

              meta_title: nd.meta_title || "",
              slug: nd.slug || generateSlug(nd.post_title || ""),
              status: "PUBLISHED",
              image: null,
             tags: nd.post_tag 
                      ? nd.post_tag
                          .split(",")                // "#AI", " #climate"
                          .map(t => t.replace("#","").trim())  // "AI", "climate"
                      : [],
              latestNews: nd.Head_Lines || false,
              headlines: nd.Head_Lines || false,
              articles: nd.articles || false,
              trending: nd.trending || false,
              breakingNews: nd.BreakingNews || false,
              upcomingEvents: nd.Event || false,
              eventStartDate: nd.Event_date || "",
              eventEndDate: nd.Eventend_date || "",
              scheduleDate: nd.schedule_date || "",
              counter: nd.viewcounter || 0,
              order: nd.order || 0,
              slugEdited: false,
              master_category: res.data.data.portal_news_id || "",
            });
             setEditorKey(Date.now());
          
          // Set image preview if available
         if (nd.post_image) {
          setImagePreview(nd.post_image);
        }

          
        }
      } catch (err) {
        console.error("Failed to load distributed news:", err);
        toast.error("Failed to load distributed news data");
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  loadDistributedNewsData();
}, [distId]);

 const handlePortalCategoryClick = async (portal) => {
  try {
    setIsPortalsLoading(true);

    // Push history ONLY when loading subcategories (NOT parent level)
    if (mappedPortals.length > 0) {
      setCategoryHistory((prev) => [...prev, mappedPortals]);
    }

    let subcats = [];
    let hasSubcategories = false;

    // ✅ FIX: Only try to fetch subcategories if we're NOT already viewing subcategories
    if (!isViewingSubcategories) {
      try {
        const subCatRes = await fetchSubCategoriesByParent(
          portal.portalId,
          portal.portalCategoryId
        );
        subcats = subCatRes?.data?.data?.categories || [];

        if (subcats.length > 0) {
          hasSubcategories = true;
          setIsViewingSubcategories(true); // Mark that we're viewing subcategories
        }
      } catch (subError) {
        hasSubcategories = false;
      }
    }

    if (hasSubcategories) {
      console.log("✅ Showing subcategories");
      setIsViewingSubcategories(true);
     setMappedPortals(
          subcats.map((c) => ({
            id: c.id,
            portalId: portal.portalId,
            portalName: portal.portalName,
            portalCategoryName: c.name,
            portalParentCategory: c.parent_name,
            portalCategoryId: c.external_id,
            selected: true,
            has_subcategories: true,
            is_manually_added: false, // ✅ ADD THIS - from click flow, not modal
          }))
      );
      return; // ✅ EXIT HERE - Don't call cross-portal mapping API
    }

    console.log("🔍 Calling cross-portal mapping API for portal.id:", portal.id);
    try {

      const matchingRes = await fetchCrossPortalMappings(portal.id);
       setIsCrossMappingChecked(true);
      const matchingData = matchingRes?.data?.data || {};
      const mappingFound = matchingData.mapping_found;
      const requestedCategory = matchingData.requested_portal_category;
      const mappedCategories = matchingData.mapped_portal_categories || [];

      // Always show matching results if mapping is found
      if (mappingFound && (mappedCategories.length > 0 || requestedCategory)) {
        setIsViewingSubcategories(false); // Reset subcategory view flag

        // Combine requested category with mapped categories
        const allCategories = [];

        // Add requested category first
        if (requestedCategory) {
          allCategories.push({
            id: requestedCategory.id,
            portalId: requestedCategory.portal_id || portal.portalId,
            portalName: requestedCategory.portal_name || portal.portalName,
            portalCategoryName: requestedCategory.name,
            portalParentCategory: requestedCategory.parent_name,
            portalCategoryId: requestedCategory.id,  
             selected: true,
            mapping_found: mappingFound,
            master_category_id: matchingData.master_category_id,
             is_requested: true,
             selected: true, 
          });
        }

        // Add mapped categories
        mappedCategories.forEach((c) => {
          allCategories.push({
            id: c.id,
            portalId: c.portal_id,
            portalName: c.portal_name,
            portalCategoryName: c.name,
            portalParentCategory: c.parent_name,
             portalCategoryId: c.id,
            selected: true,
            mapping_found: mappingFound,
            master_category_id: matchingData.master_category_id,
          });
        });

        setMappedPortals(allCategories);

        const totalCount = allCategories.length;
        toast.success(`Found ${mappedCategories.length} matched categories `);
      } else if (requestedCategory && !hasSubcategories) {
        setMappedPortals([
          {
            id: requestedCategory.id,
            portalId: requestedCategory.portal_id || portal.portalId,
            portalName: requestedCategory.portal_name || portal.portalName,
            portalCategoryName: requestedCategory.name,
            portalParentCategory: requestedCategory.parent_name,
            portalCategoryId: requestedCategory.id,
            selected: true,
            mapping_found: mappingFound,
          },
        ]);

        if (!mappingFound) {
          toast.info("No related categories mapped yet");
        }
      } else if (!hasSubcategories && !mappingFound) {
        // No subcategories and no mapping found
        toast.info("No categories found for this selection");
        setCategoryHistory((prev) => prev.slice(0, -1));
      }
    } catch (matchError) {
      setIsCrossMappingChecked(true);
      // If no subcategories and matching failed, remove from history
      if (!hasSubcategories) {
        setCategoryHistory((prev) => prev.slice(0, -1));
        toast.error("Failed to load categories");
      }
    }
  } catch (e) {
    console.error("❌ Unexpected error:", e);
    toast.error("Failed to load categories. Please try again.");
    setCategoryHistory((prev) => prev.slice(0, -1));
  } finally {
    setIsPortalsLoading(false);
  }
};

  const handleCategorySelect = async (e, loadNext = false) => {
    const categoryId = loadNext ? formData.master_category : e.target.value;

   if (!loadNext) {
  setFormData((prev) => ({
    ...prev,
    master_category: categoryId,
  }));
  
  setMappedPortals([]);          // clear old categories
  setCategoryHistory([]);        // reset history
  setShowPortalSection(false);   // hide header while loading
  setIsViewingSubcategories(false); // reset subcategory view flag
}


    if (!categoryId) {
      setMappedPortals([]);
      setShowPortalSection(false);
      setCategoryHistory([]); // Clear history
      return;
    }
    if (!loadNext) setIsPortalsLoading(true);
    try {
      if (loadNext) setIsLoadingMore(true);
      const res = await fetchPortalParentCategories(
        categoryId,
        loadNext ? nextPage : 1
      );
      const raw = res?.data?.data;
      console.log("raew", raw);

      const mappings = raw?.parent_categories ?? [];
      console.log("mappings", mappings);

      const next = res?.data?.pagination?.next || null;
      // console.log("🔹 Next page URL:", next);

      if (Array.isArray(mappings) && mappings.length > 0) {
        const excluded = Array.isArray(drafts?.excluded_portals)
          ? drafts.excluded_portals.map(Number)
          : [];

        // Get the selected portal name from assignedCategories
        const selectedPortal = assignedCategories.find(
          (cat) => cat.id === Number(categoryId)
        );
        const portalName = selectedPortal?.name || "Portal";

        const formatted = mappings.map((item) => ({
          id: item.parent_external_id,
          portalId: Number(categoryId),
          portalName: portalName,
          portalCategoryName: item.parent_name,
          portalCategoryId: item.parent_external_id,
          selected: true,
        }));

        setMappedPortals((prev) => [...prev, ...formatted]);
        setShowPortalSection(true);
        if (next) {
          const nextPageParam = new URL(next).searchParams.get("page");
          setNextPage(Number(nextPageParam));
          // console.log(Number(nextPageParam))
        } else {
          setNextPage(null);
        }
      } else {
        setShowPortalSection(false);
      }
    } catch (err) {
      console.error("❌ Error fetching mapped portals:", err);
    } finally {
      if (loadNext) setIsLoadingMore(false);
      if (!loadNext) setIsPortalsLoading(false);
    }
  };

  const handleViewDrafts = async () => {
    try {
      const res = await fetchDraftNews();
      if (res.data?.status && Array.isArray(res.data.data)) {
        setDrafts(res.data.data);
        setShowDrafts(!showDrafts);
      }
    } catch (err) {
      console.error("Error fetching drafts:", err);
    }
  };

  const handleSelectDraft = async (draft) => {
    setFormData({
      ...formData,
      id: draft?.id || "",
      headline: draft.title || "",
      title: draft.title || "",
      shortDesc: draft.short_description || "",
      longDesc: draft.content || "",
      meta_title: draft.meta_title || "",
      slug: draft.slug || "",
      status: draft.status || "DRAFT",
      image: draft?.post_image || null,
      latestNews: draft.latest_news || false,
      upcomingEvents: draft.upcoming_event || false,
      headlines: draft.Head_Lines || false,
      articles: draft.articles || false,
      trending: draft.trending || false,
      breakingNews: draft.BreakingNews || false,
      eventStartDate: draft.Event_date || "",
      eventEndDate: draft.Event_end_date || "",
      scheduleDate: draft.schedule_date || "",
      counter: draft.counter || 0,
      excluded_portals: draft.excluded_portals || [],
    });
    console.log(draft.excluded_portals);

    setOriginalDraft(draft);

    setImagePreview(
      draft?.post_image ? `${constant.appBaseUrl}${draft.post_image}` : null
    );
    setShowDrafts(false);
    // toast.info(`Loaded draft: ${draft.title}`);
    if (draft.master_category) {
      setFormData((prev) => ({
        ...prev,
        master_category: draft.master_category,
      }));
      const res = await fetchMappedCategoriesById(draft.master_category);
      if (res.data?.status && Array.isArray(res.data?.data)) {
        const formatted = res.data.data.map((item) => ({
          id: item.id,
          portalId: item.portal_id,
          portalName: item.portal_name,
          categoryId: item.master_category,
          categoryName: item.master_category_name,
          portalCategoryName: item.portal_category_name,
          selected: !(
            Array.isArray(draft.excluded_portals) &&
            draft.excluded_portals.map(Number).includes(Number(item.portal_id))
          ),
        }));
        setMappedPortals(formatted);
        setShowPortalSection(true);
      }
    }
  };

 // Add this helper function to handle portal-specific image uploads
const handlePortalImageUpload = (portalId, file) => {
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    toast.warning("Image size must be less than 10MB");
    return;
  }

  // ✅ STORE ORIGINAL FILE TEMPORARILY (so we can get its name later)
  setPortalImages(prev => ({
    ...prev,
    [portalId]: file
  }));

  // ✅ TELL SYSTEM THIS IS PORTAL IMAGE (NOT FEATURED)
  setActivePortalForCrop(portalId);

  // ✅ OPEN CROPPER ONLY FOR PORTAL IMAGE
  setCropPreview(URL.createObjectURL(file));
  setShowCropper(true);
};


// Add this helper function to remove portal image
const removePortalImage = (portalId) => {
  // Revoke preview URL
  if (portalImagePreviews[portalId]) {
    URL.revokeObjectURL(portalImagePreviews[portalId]);
  }
  
  // Remove from state
  setPortalImages(prev => {
    const updated = { ...prev };
    delete updated[portalId];
    return updated;
  });
  
  setPortalImagePreviews(prev => {
    const updated = { ...prev };
    delete updated[portalId];
    return updated;
  });
};
const buildDraftDiff = (oldData, newData) => {
    const diff = {};
    Object.keys(newData).forEach((key) => {
      if (newData[key] !== oldData[key]) diff[key] = newData[key];
    });
    return diff;
  };

  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
  };

  const revokeIfBlob = (url) => {
    if (url && typeof url === "string" && url.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(url);
      } catch (_) {}
    }
  };

  const setPreviewFromFile = (file) => {
    const objectUrl = URL.createObjectURL(file);
    revokeIfBlob(imagePreview);
    setImagePreview(objectUrl);
  };

  const getRadianAngle = (deg) => (deg * Math.PI) / 180;

  const rotateSize = (width, height, rotationDeg) => {
    const rotRad = getRadianAngle(rotationDeg);
    return {
      width:
        Math.abs(Math.cos(rotRad) * width) +
        Math.abs(Math.sin(rotRad) * height),
      height:
        Math.abs(Math.sin(rotRad) * width) +
        Math.abs(Math.cos(rotRad) * height),
    };
  };

  const getCroppedImg = async (imageSrc, cropPixels, rotationDeg = 0) => {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = imageSrc;
    });

    const rotRad = getRadianAngle(rotationDeg);
    const { width: rotatedW, height: rotatedH } = rotateSize(
      image.width,
      image.height,
      rotationDeg
    );

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = Math.round(rotatedW);
    tempCanvas.height = Math.round(rotatedH);
    const tctx = tempCanvas.getContext("2d");
    tctx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tctx.rotate(rotRad);
    tctx.drawImage(image, -image.width / 2, -image.height / 2);

    const outCanvas = document.createElement("canvas");
    outCanvas.width = Math.round(cropPixels.width);
    outCanvas.height = Math.round(cropPixels.height);
    const outCtx = outCanvas.getContext("2d");
    outCtx.imageSmoothingEnabled = false;
    outCtx.imageSmoothingQuality = "high";


    outCtx.drawImage(
      tempCanvas,
      Math.round(cropPixels.x),
      Math.round(cropPixels.y),
      Math.round(cropPixels.width),
      Math.round(cropPixels.height),
      0,
      0,
      Math.round(cropPixels.width),
      Math.round(cropPixels.height)
    );

    return await new Promise((resolve) => {
      outCanvas.toBlob((blob) => resolve(blob), "image/jpeg");
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };
      if (name === "meta_title" && !prev.slugEdited) {
        newData.slug = generateSlug(value);
      }
      return newData;
    });
  };

  const handleSlugChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      slug: e.target.value,
      slugEdited: true,
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.warning("Image size must be less than 10MB");
        return;
      }
       setActivePortalForCrop(null); 
      setFormData((prev) => ({ ...prev, image: file }));
      setCropPreview(URL.createObjectURL(file));
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setShowCropper(true);
    }
  };

  const removeImage = () => {
    revokeIfBlob(imagePreview);
    setFormData((prev) => ({ ...prev, image: null }));
    setImagePreview(null);
  };

  const onCropComplete = (croppedArea, croppedAreaPx) => {
    setCroppedAreaPixels(croppedAreaPx);
  };

  const applyCrop = async () => {
     console.log("DEBUG activePortalForCrop:", activePortalForCrop);
    if (!cropPreview  || !croppedAreaPixels) {
      setShowCropper(false);
      return;
    }
    try {
      const blob = await getCroppedImg(
       cropPreview,
        croppedAreaPixels,
        rotation
      );
      if (!blob) return;
     const originalName = activePortalForCrop !== null 
  ? (portalImages[activePortalForCrop]?.name || formData?.image?.name || "image.jpg")
  : (formData?.image?.name || "image.jpg");

    const baseName = originalName.replace(/\.[^/.]+$/, "");

    const croppedFile = new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
    });

    

      // Convert JPEG → WebP
      let finalFile = croppedFile;
      try {
       const { webpBlob } = await webpfy({
        image: croppedFile,
        fileName: `${baseName}.webp`,
        lossless: true
      });

        if (webpBlob) {
          finalFile = new File(
                [webpBlob],
                `${baseName}.webp`,
                { type: "image/webp" }
              );
         
        }
      } catch (webpError) {
        console.warn("WebP conversion failed, using original JPEG:", webpError);
      }

      if (activePortalForCrop !== null) {
          // ✅ PORTAL IMAGE ONLY - Use finalFile (WebP converted)
          setPortalImages(prev => ({
            ...prev,
            [activePortalForCrop]: finalFile  // ← Changed from croppedFile
          }));

          setPortalImagePreviews(prev => ({
            ...prev,
            [activePortalForCrop]: URL.createObjectURL(finalFile)  // ← Changed from croppedFile
          }));

          // ✅ RESET FLAG
          setActivePortalForCrop(null);
          } else {
            // ✅ FEATURED IMAGE ONLY - Use finalFile (WebP converted)
            setFormData(prev => ({ ...prev, image: finalFile }));  // ← Changed from croppedFile
            setPreviewFromFile(finalFile);  // ← Changed from croppedFile
            console.log("FINAL FEATURED IMAGE TYPE:", finalFile.type);
          }
      } catch (e) {
            console.error("Crop failed", e);
          } finally {
            setCropPreview(null);
             setShowCropper(false);
              setActivePortalForCrop(null);
          }
        };

  useEffect(() => {
    const loadTags = async () => {
      try {
        const res = await fetchAllTags();
        if (res.data?.status && res.data?.tags) {
          setAvailableTags(res.data.tags);
        }
      } catch (err) {
        console.error("Failed to fetch tags:", err);
      } finally {
        setIsTagsLoading(false);
      }
    };

    loadTags();

    return () => {
      revokeIfBlob(imagePreview);
    };
  }, []);

  const loadAssignedCategories = async (page = 1, append = false) => {
    try {
      if (!userId) {
        console.error("❌ User ID not found in localStorage");
        return;
      }

      // 🔥 SHOW LOADING IMMEDIATELY FOR BOTH PORTAL AND CATEGORIES
      setIsCategoryloading(true);
      setShowPortalSection(true);
      setIsPortalsLoading(true);

      const res = await fetchUserPortalsByUserId(userId, page);

      if (
        res?.data?.status &&
        Array.isArray(res.data.data) &&
        res.data.data.length > 0
      ) {
        const portals = res.data.data.map((item) => ({
          id: Number(item.portal_id),
          name: item.portal_name,
        }));

        const finalList = append
          ? [...assignedCategories, ...portals]
          : portals;
        setAssignedCategories(finalList);

        // 🔥 AUTO-SELECT FIRST PORTAL AND FETCH CATEGORIES IMMEDIATELY
        if (finalList.length > 0 && !distId) {
          const defaultPortal = finalList[0];

          setFormData((p) => ({
            ...p,
            master_category: defaultPortal.id,
          }));

          // 🔥 FETCH PARENT CATEGORIES (NO WAITING)
          try {
            const categoryRes = await fetchPortalParentCategories(
              defaultPortal.id
            );
            const parents = categoryRes?.data?.data?.parent_categories || [];

            setMappedPortals(
              parents.map((c) => ({
                id: c.parent_external_id,
                portalId: defaultPortal.id,
                portalName: defaultPortal.name,
                portalCategoryName: c.parent_name,
                portalCategoryId: c.parent_external_id,
                selected: true,
                has_subcategories: true,
              }))
            );
          } catch (err) {
            console.error("❌ Failed to fetch parent categories:", err);
            setMappedPortals([]);
          }
        }

        const nextUrl = res.data?.pagination?.next;
        if (nextUrl) {
          const nextPageParam = new URL(nextUrl).searchParams.get("page");
          setNextCategoryPage(Number(nextPageParam));
        } else {
          setNextCategoryPage(null);
        }

        // 🔥 HIDE LOADING AFTER PORTAL DATA IS LOADED
        setIsCategoryloading(false);
      } else {
        console.warn("⚠️ No portal found for this user.");
        setAssignedCategories([]);
        setFormData((p) => ({
          ...p,
          master_category: null,
        }));
        setMappedPortals([]);
        setShowPortalSection(false);
        // 🔥 HIDE LOADING IMMEDIATELY WHEN NO PORTALS
        setIsCategoryloading(false);
        setIsPortalsLoading(false);
        // 🔥 CLOSE THE MODAL WHEN NO PORTALS
        setShowPortalCategoryModal(false);
      }
   } catch (err) {
      console.error("❌ Failed to fetch portal list:", err);
      setAssignedCategories([]);
      setMappedPortals([]);
      setShowPortalSection(false);
      setIsCategoryloading(false);
      // keep modal closed if error
      setShowPortalCategoryModal(false);
    } finally {
      // ALWAYS stop portal-loading spinner regardless of stale state
      setIsPortalsLoading(false);
    }
  };
const resetPortalImages = () => {
  setShowPortalImageUpload(false); // modal close
  setPortalImages({});
  setPortalImagePreviews({});
};
const handleGoBack = (resetImages) => {
  if (categoryHistory.length > 0) {
    const previousState = categoryHistory[categoryHistory.length - 1];

    // 🔁 restore previous mapped portals
    setMappedPortals(previousState);

    // 🧹 pop history
    setCategoryHistory((prev) => prev.slice(0, -1));

    // ⬅️ exit subcategory view
    setIsViewingSubcategories(false);

    // 🔍 check mapping exists or not
    const hasMappedPortals = previousState.some(
      (p) => p.mapping_found === true
    );

    // ❌ reset cross mapping & images ONLY when mapping not found
    if (!hasMappedPortals) {
      setIsCrossMappingChecked(false);

      // 🔥 close modal + clear images safely
      resetImages?.();
    }
  }
};



  useEffect(() => {
    loadAssignedCategories();
  }, []);

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const handleTagKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

// NewsArticleForm.jsx - Replace the handleSubmit function with this updated version

const handleSubmit = async (e, statusType = "PUBLISHED") => {
  e.preventDefault();

  const valid_statuses = ["DRAFT", "PUBLISHED", "rejected"];

  if (!formData.meta_title.trim()) {
    toast.warning("Meta title is required.");
    return;
  }

  if (!valid_statuses.includes(statusType)) {
    toast.warning(`Invalid status. Must be one of: ${valid_statuses.join(", ")}`);
    return;
  }

  if (!formData.image && !imagePreview) {
    toast.warning("Please upload a post image before submitting.");
    return;
  }

  if (formData.shortDesc.length > 160) {
    toast.warning("Short description must be less than 160 characters.");
    return;
  }

  setIsLoading(true);

  try {
    // ✅ Handle DISTRIBUTED NEWS UPDATE
if (isDistributedEdit && distributedNewsId) {
  const updatePayload = {
   ai_title: formData.headline || formData.title,
    ai_short_description: formData.shortDesc,
    ai_content: formData.longDesc,
    ai_meta_title: formData.meta_title,
    ai_slug: formData.slug,
    post_tag: formData.tags && formData.tags.length > 0
      ? formData.tags
          .map((tag) => {
            const tagData = availableTags.find((t) => t.id === tag);
            const tagName = tagData ? tagData.name : tag;
            return `#${tagName}`;
          })
          .join(", ")
      : "",
    is_active: formData.latestNews ? 1 : 0,
    Head_Lines: formData.headlines ? 1 : 0,
    articles: formData.articles ? 1 : 0,
    trending: formData.trending ? 1 : 0,
    BreakingNews: formData.breakingNews ? 1 : 0,
    Event: formData.upcomingEvents ? 1 : 0,
    Event_date: formData.eventStartDate 
      ? new Date(formData.eventStartDate).toISOString().split("T")[0]
      : null,
    Event_end_date: formData.eventEndDate
      ? new Date(formData.eventEndDate).toISOString().split("T")[0]
      : null,
    schedule_date: formData.scheduleDate || null,
    post_status: statusType === "PUBLISHED" ? 100 : 0,
  };

  // Only add image if a new one was uploaded
  if (formData.image && typeof formData.image !== 'string') {
    updatePayload.edited_image = formData.image;
  }

  const res = await updateDistributedNews(distributedNewsId, updatePayload);
  
  if (res?.data?.status) {
    
    // Clear all fields after update
        resetForm();
        setImagePreview(null);
        setMappedPortals([]);
        setCategoryHistory([]);
    // Redirect back to news list
        navigate('/news-list');
    
    return;
  } else {
    toast.error(res?.data?.message || "Failed to update distributed news.");
    setIsLoading(false);
    return;
  }
}

    // ✅ Original logic for master news posts (unchanged)
    const formDataToSend = new FormData();

    formDataToSend.append("title", formData.title || formData.headline);
    formDataToSend.append("short_description", formData.shortDesc);
    formDataToSend.append("content", formData.longDesc);
    formDataToSend.append("post_image", formData.image);
    formDataToSend.append("meta_title", formData.meta_title);
    formDataToSend.append("slug", formData.slug);
    formDataToSend.append("status", statusType);
    formDataToSend.append("counter", formData.counter);
    formDataToSend.append("order", formData.order);
    formDataToSend.append(
      "cross_portal_category_id",
      mappedPortals[0]?.mapping_found
        ? mappedPortals[0]?.portalCategoryId
        : mappedPortals[0]?.id
    );

    if (formData.tags && formData.tags.length > 0) {
      const formattedTags = formData.tags
        .map((tag) => {
          const tagData = availableTags.find((t) => t.id === tag);
          const tagName = tagData ? tagData.name : tag;
          return `#${tagName}`;
        })
        .join(", ");
      formDataToSend.append("post_tag", formattedTags);
    }

    formDataToSend.append("latest_news", formData.latestNews ? "true" : "false");
    formDataToSend.append("Head_Lines", formData.headlines ? "true" : "false");
    formDataToSend.append("articles", formData.articles ? "true" : "false");
    formDataToSend.append("trending", formData.trending ? "true" : "false");
    formDataToSend.append("BreakingNews", formData.breakingNews ? "true" : "false");
    formDataToSend.append("upcoming_event", formData.upcomingEvents ? "true" : "false");

    if (formData.eventStartDate) {
      formDataToSend.append(
        "Event_date",
        new Date(formData.eventStartDate).toISOString().split("T")[0]
      );
    }
    if (formData.eventEndDate) {
      formDataToSend.append(
        "Event_end_date",
        new Date(formData.eventEndDate).toISOString().split("T")[0]
      );
    }
    if (formData.scheduleDate) {
      formDataToSend.append("schedule_date", formData.scheduleDate);
    }

    let createdArticle;

    // UPDATE EXISTING MASTER NEWS
    if (formData.id) {
      const nextStatus = statusType === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
      const changedFields = originalDraft
        ? buildDraftDiff(originalDraft, formData)
        : formData;

      if (changedFields.longDesc) {
        changedFields.content = changedFields.longDesc;
        delete changedFields.longDesc;
      }

      changedFields.title = changedFields.title || formData.headline;
      changedFields.content = formData.longDesc || formData.content;
      changedFields.master_category = Number(formData.master_category);

      const selectedCategories = mappedPortals
  .filter((p) => p.selected && p.is_manually_added === true)
  .map((p) => Number(p.id));

      const excludedCategories = mappedPortals
        .filter((p) => !p.selected)
        .map((p) => Number(p.id));

      // ✅ ONLY send when manually added portals exist
        changedFields.portal_category_ids = selectedCategories.length
          ? selectedCategories
          : [];
      changedFields.exclude_portal_categories = excludedCategories;

      createdArticle = { id: formData.id };
      if (nextStatus === "DRAFT") toast.success("Draft saved successfully.");
    }
    // CREATE NEW MASTER NEWS
    else {
      const newlyAddedCategories = mappedPortals
        .filter((p) => p.portalId === 0 && p.selected && p.portalCategoryId)
        .map((p) => Number(p.id));

      const excludedCategories = mappedPortals
        .filter((p) => !p.selected && p.portalId !== 0 && p.portalCategoryId)
        .map((p) => Number(p.portalCategoryId));

      if (mappedPortals[0]?.mapping_found) {
        formDataToSend.append(
          "portal_category_ids",
          JSON.stringify(newlyAddedCategories)
        );
      } else {
        const categoryIds =
          newlyAddedCategories.length > 0
          ? newlyAddedCategories
          : [];
        formDataToSend.append(
          "portal_category_ids",
          JSON.stringify(categoryIds)
        );
      }
      formDataToSend.append(
        "exclude_portal_categories",
        JSON.stringify(excludedCategories)
      );

      const response = await createNewsArticle(formDataToSend);
      createdArticle = response.data.data;
    }

    if (statusType === "DRAFT") {
      setIsPublished(false); 
      resetForm();
      await loadAssignedCategories();
      setIsLoading(false);
      return;
    }

      if (statusType === "PUBLISHED") {
      if (Object.keys(portalImages).length > 0) {
        try {
          const portalImageArray = Object.entries(portalImages).map(([portalId, file]) => ({
            portalId: Number(portalId),
            file: file
          }));

          await uploadMultipleImages(createdArticle.id, portalImageArray);
          toast.success(`Successfully uploaded ${portalImageArray.length} portal image${portalImageArray.length > 1 ? 's' : ''}`);
          
          // Clear portal images after successful upload
          setPortalImages({});
          Object.values(portalImagePreviews).forEach(url => URL.revokeObjectURL(url));
          setPortalImagePreviews({});
        } catch (imgErr) {
          console.error("❌ Portal image upload failed:", imgErr);
          toast.error("Failed to upload portal images. Please try again.");
          setIsLoading(false);
          return; // Stop execution if image upload fails
        }
      }

      // 🔥 STEP 2: Publish article AFTER images are uploaded
      const res = await publishNewsArticle(createdArticle.id, {
        portal_category_id: mappedPortals[0]?.mapping_found
          ? mappedPortals[0]?.master_category_id
          : mappedPortals[0]?.id,
      });
        
      if (res?.data?.message) toast.success(res.data.message);
      // After successful publish API call
        if (statusType === "PUBLISHED") {
          setIsPublished(true);
          setShowPortalImageUpload(false);
           setIsCrossMappingChecked(false);
            setIsViewingSubcategories(false); 
        }
       setMappedPortals([]);
      setSelectedPortalForCategories("");
      setCategoryHistory([]);
      resetForm();
      await loadAssignedCategories();
  

      
      if (mappedPortals.length === 0 && assignedCategories.length > 0) {
        const defaultPortalId = assignedCategories[0]?.id;
        if (defaultPortalId) {
          try {
            const categoryRes = await fetchPortalParentCategories(defaultPortalId);
            const parents = categoryRes?.data?.data?.parent_categories || [];
            if (parents.length) {
              setMappedPortals(
                parents.map((c) => ({
                  id: c.parent_external_id,
                  portalId: defaultPortalId,
                  portalName: assignedCategories[0].name,
                  portalCategoryName: c.parent_name,
                  portalCategoryId: c.parent_external_id,
                  selected: true,
                  has_subcategories: true,
                }))
              );
              setShowPortalSection(true);
            } else {
              setShowPortalSection(false);
            }
          } catch (err) {
            setShowPortalSection(false);
          }
        }
      } else {
        setShowPortalSection(mappedPortals.length > 0);
      }
    } else {
      resetForm();
    }
  } catch (err) {
    console.error("Error processing form:", err);
    toast.error("Failed to process form.");
  } finally {
    setIsLoading(false);
  }
};

const handleBackgroundPublish = async (e) => {
  e.preventDefault();

  if (!formData.meta_title.trim()) {
    toast.warning("Meta title is required.");
    return;
  }

  if (!formData.image && !imagePreview) {
    toast.warning("Please upload a post image before submitting.");
    return;
  }

  if (formData.shortDesc.length > 160) {
    toast.warning("Short description must be less than 160 characters.");
    return;
  }

  setIsLoading(true);

  try {
    // First create/publish the article normally to get the news ID
    const formDataToSend = new FormData();
    formDataToSend.append("title", formData.title || formData.headline);
    formDataToSend.append("short_description", formData.shortDesc);
    formDataToSend.append("content", formData.longDesc);
    formDataToSend.append("post_image", formData.image);
    formDataToSend.append("meta_title", formData.meta_title);
    formDataToSend.append("slug", formData.slug);
    formDataToSend.append("status", "PUBLISHED");
    formDataToSend.append("counter", formData.counter);
    formDataToSend.append("order", formData.order);
    formDataToSend.append(
      "cross_portal_category_id",
      mappedPortals[0]?.mapping_found
        ? mappedPortals[0]?.portalCategoryId
        : mappedPortals[0]?.id
    );

    if (formData.tags && formData.tags.length > 0) {
      const formattedTags = formData.tags
        .map((tag) => {
          const tagData = availableTags.find((t) => t.id === tag);
          const tagName = tagData ? tagData.name : tag;
          return `#${tagName}`;
        })
        .join(", ");
      formDataToSend.append("post_tag", formattedTags);
    }

    formDataToSend.append("latest_news", formData.latestNews ? "true" : "false");
    formDataToSend.append("Head_Lines", formData.headlines ? "true" : "false");
    formDataToSend.append("articles", formData.articles ? "true" : "false");
    formDataToSend.append("trending", formData.trending ? "true" : "false");
    formDataToSend.append("BreakingNews", formData.breakingNews ? "true" : "false");
    formDataToSend.append("upcoming_event", formData.upcomingEvents ? "true" : "false");

    if (formData.eventStartDate) {
      formDataToSend.append(
        "Event_date",
        new Date(formData.eventStartDate).toISOString().split("T")[0]
      );
    }
    if (formData.eventEndDate) {
      formDataToSend.append(
        "Event_end_date",
        new Date(formData.eventEndDate).toISOString().split("T")[0]
      );
    }
    if (formData.scheduleDate) {
      formDataToSend.append("schedule_date", formData.scheduleDate);
    }

    const newlyAddedCategories = mappedPortals
      .filter((p) => p.portalId === 0 && p.selected && p.portalCategoryId)
      .map((p) => Number(p.id));

    const excludedCategories = mappedPortals
      .filter((p) => !p.selected && p.portalId !== 0 && p.portalCategoryId)
      .map((p) => Number(p.portalCategoryId));

    formDataToSend.append(
      "portal_category_ids",
      JSON.stringify(newlyAddedCategories)
    );
    formDataToSend.append(
      "exclude_portal_categories",
      JSON.stringify(excludedCategories)
    );

    let response;
    try {
      response = await createNewsArticle(formDataToSend);
    }catch (createErr) {
      // createErr IS the response data directly (due to axios interceptor)
      const errorData = typeof createErr === "object" ? createErr : { message: createErr };

      if (errorData?.message && typeof errorData.message === "object") {
        Object.entries(errorData.message).forEach(([field, errors]) => {
          const messages = Array.isArray(errors) ? errors.join(", ") : errors;
          toast.error(`${field}: ${messages}`);
        });
      } else {
        toast.error(errorData?.message || "Failed to create article.");
      }
      setIsLoading(false);
      return;
    }
    const createdArticle = response.data.data;

    // Now call background publish API
    const bgResponse = await fetch(
    `${constant.appBaseUrl}/api/back-ground/publish/news/${createdArticle.id}/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${JSON.parse(localStorage.getItem("auth_user"))?.token || ""}`,
        },
      }
    );

    const bgData = await bgResponse.json();

    if (bgData?.status) {
      toast.success("News queued successfully! Publishing in background.");
      resetForm();
      await loadAssignedCategories();
    } else {
      toast.error(bgData?.message || "Failed to queue background publish.");
    }
  } catch (err) {
    console.error("Background publish error:", err);
    toast.error("Failed to queue background publish.");
  } finally {
    setIsLoading(false);
  }
};



  const [editorKey, setEditorKey] = useState(Date.now());
  const resetForm = () => {
     setIsPublished(false);
     setIsCrossMappingChecked(false); 
    revokeIfBlob(imagePreview);
   setFormData((prev) => ({
  headline: "",
  title: "",
  shortDesc: "",
  longDesc: "",
  image: null,
  tags: [],
  content: "",
  latestNews: false,
  headlines: false,
  articles: false,
  trending: false,
  breakingNews: false,
  upcomingEvents: false,
  eventStartDate: "",
  eventEndDate: "",
  scheduleDate: "",
  counter: 0,
  order: 0,
  status: "PUBLISHED",
  meta_title: "",
  slug: "",
  slugEdited: false,

  // 🔥 DO NOT TOUCH master_category → keep the default portal selected
  master_category: prev.master_category,
}));

    setTagInput("");
    setImagePreview(null);
    setEditorKey(Date.now()); // 🔑 Force CKEditor remount
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-200">
          {/* <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          pauseOnHover
          draggable
        /> */}

          {/* Header */}
          <div className="bg-black px-6 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {distId ? "Update News Article" : "Create News Article"}
                  </h1>

                  <p className="text-gray-300 text-sm">
                    Fill in the details to publish your article
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleViewDrafts}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg text-xs hover:bg-white/20 transition-all flex items-center space-x-2 border border-white/20"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Drafts</span>
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg text-xs hover:bg-white/20 transition-all flex items-center space-x-2 border border-white/20"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
                <div className="flex space-x-2">
                <button
                    type="button"
                    disabled={isLoading}
                    onClick={(e) => handleSubmit(e, "DRAFT")}
                    className="px-8 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg text-xs font-semibold hover:from-gray-600 hover:to-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg"
                  >
                    <SaveAll className="w-4 h-4 mr-2" />
                    Save as Draft
                  </button>

                  {/* Publish Article (normal) */}
                  {!distId && (
                    <button
                      type="button"
                      disabled={isLoading}
                      // onClick={(e) => handleSubmit(e, "PUBLISHED")}
                      onClick={(e) => {
                        e.preventDefault();
                        // Only show warning if status is PUBLISHED
                        setShowPublishWarning(true);
                      }}
                      className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-500 text-white rounded-lg text-sm font-semibold hover:from-gray-500 hover:to-gray-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg"
                    >
                      {isLoading ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <>
                          <Save className="w-5 h-5 mr-2" />
                          Publish Article
                        </>
                      )}
                    </button>
                  )}

                  {/* Background Publish (primary CTA) */}
                  {!distId && (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleBackgroundPublish}
                      className="px-8 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-lg text-sm font-semibold hover:from-gray-800 hover:to-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg"
                    >
                      {isLoading ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <>
                          <RefreshCw className="w-5 h-5 mr-2" />
                          Background Publish
                        </>
                      )}
                    </button>
                  )}

                  {/* Distributed edit CTA */}
                  {distId && (
                    <button
                      type="submit"
                      disabled={isLoading}
                      onClick={(e) => handleSubmit(e, "PUBLISHED")}
                      className="px-8 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-lg text-sm font-semibold hover:from-gray-800 hover:to-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg"
                    >
                      {isLoading ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <>
                          <Save className="w-5 h-5 mr-2" />
                          Update & Publish
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="p-8 space-y-8">
            {/* Basic Info */}
            <section className="space-y-5">
            {!distId && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT SIDE: portal Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Portal
                  </label>

                  {isCategoryloading ? (
                    // 🔹 Loading state
                    <input
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm bg-gray-100"
                      value="Loading portals..."
                    />
                  ) : assignedCategories.length === 0 ? (
                    // 🔹 NO PORTAL FOUND → Show message in input box
                    <input
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm bg-white text-gray-500"
                      value="No portal found"
                    />
                  ) : assignedCategories.length === 1 ? (
                    // 🔹 ONLY ONE PORTAL → Show readonly input with auto-selected portal
                    <input
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm bg-gray-50"
                      value={assignedCategories[0].name}
                      readOnly
                    />
                  ) : (
                    // 🔹 MULTIPLE PORTALS → Dropdown with default selected
                    <select
                      name="master_category"
                      value={
                        formData.master_category || assignedCategories[0]?.id
                      }
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          master_category: e.target.value,
                        }));
                        handleCategorySelect(e);
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    >
                      {/* Default portal auto selected */}
                      {assignedCategories.map((portal) => (
                        <option key={portal.id} value={portal.id}>
                          {portal.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
             )}
              {showPortalSection && !distId && (
                <section className="space-y-5 mt-2 border-2 p-2 border-gray-200 rounded relative">
                  {/* Header Section */}
                  <div className="relative flex items-center justify-between items-center pb-3 border-b-2 border-gray-200">

                    {/* LEFT: Icon + Title + Back Button */}
                    <div className="flex items-center space-x-3">
                      {/* Settings Icon */}
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Settings className="w-5 h-5 text-gray-700" />
                      </div>

                      {/* Title */}
                    <h2 className="text-lg font-semibold text-gray-900">
                         {mappedPortals?.length > 0 && mappedPortals[0]?.mapping_found
                              ? "Select matched portal"
                              : categoryHistory.length > 0
                              ? "Select subcategory"
                              : "Select category"}
                          {" "}
                          from{" "}
                          <span className="font-bold">
                            {
                              assignedCategories.find(
                                (p) => p.id === Number(formData.master_category)
                              )?.name || "Selected"
                            }
                          </span>
                        </h2>
                    </div>

                   <div className="flex items-center gap-3">
                        {/* Manage Button */}
                        {!showPortalCategoryModal &&
                          formData.master_category &&
                          categoryHistory.length > 0 &&
                          !mappedPortals[0]?.has_subcategories && (
                            <button
                              type="button"
                              className="px-3 py-2 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700"
                              onClick={() => {
                                setForceEnablePortal(true);
                                setShowPortalCategoryModal(true);
                              }}
                            >
                              Manage Portal Categories
                            </button>
                          )}

                        {/* Back Button */}
                        {categoryHistory.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleGoBack(resetPortalImages)}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-all"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back
                          </button>
                        )}
                      </div>

                  </div>

                  {/* Portal list */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">

                    {isPortalsLoading ? (
                      <p className="text-center col-span-full py-5 text-gray-600">
                        Loading...
                      </p>
                    ) : isLoadingMore ? (
                      <p className="text-center col-span-full py-5 text-gray-600">
                        Loading...
                      </p>
                    ) : (
                      <>
                        {/* Map through portals */}
                        {mappedPortals.map((portal, i) => {
                          // Check if manually added (has timestamp-based id)
                          const isManuallyAdded =
                            portal.is_manually_added === true;

                          return (
                            <div
                              key={i}
                             onClick={(e) => {
                                      // 🔒 Requested portal → DO NOTHING
                                      if (portal.is_requested) {
                                        e.stopPropagation();
                                        return;
                                      }

                                      // ✅ Only mapped portals can toggle
                                      if (portal.mapping_found) {
                                        e.stopPropagation();
                                        setMappedPortals((prev) =>
                                          prev.map((p) =>
                                            p.id === portal.id ? { ...p, selected: !p.selected } : p
                                          )
                                        );
                                        return;
                                      }

                                      // ✅ Normal flow (subcategory / API)
                                      handlePortalCategoryClick(portal);
                                    }}

                              className={`relative flex items-center space-x-3 border-2 p-4 rounded-xl cursor-pointer transition-all ${
                                portal.selected
                                  ? "bg-gray-900 border-gray-900 text-white shadow-lg"
                                  : "bg-white border-gray-900 hover:border-gray-400"
                              }`}
                            >
                              {/* DELETE BUTTON for manually added categories */}
                              {isManuallyAdded && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMappedPortals((prev) =>
                                      prev.filter(
                                        (p) =>
                                          !(
                                            p.portalName ===
                                              portal.portalName &&
                                            p.portalCategoryId ===
                                              portal.portalCategoryId
                                          )
                                      )
                                    );
                                  }}
                                  className="absolute top-2 right-2 p-1 bg-white text-white rounded-full transition-all z-10"
                                >
                                  <X className="w-3 h-3 text-black" />
                                </button>
                              )}

                              <div className="w-full">
                                {portal.mapping_found ? (
                                  <>
                                    {/* Checkbox Section */}
                                  <div className="absolute top-3 left-3">
                                      <input
                                        type="checkbox"
                                        checked={portal.selected}
                                        disabled={portal.is_requested}   // 🔒 disable click
                                        onChange={() => {
                                          if (portal.is_requested) return;

                                          setMappedPortals((prev) =>
                                            prev.map((p, idx) =>
                                              idx === i ? { ...p, selected: !p.selected } : p
                                            )
                                          );
                                        }}
                                        className={`w-5 h-5 accent-gray-900 ${
                                          portal.is_requested ? "cursor-not-allowed opacity-80" : ""
                                        }`}
                                      />
                                    </div>

                                    {/* Text Content - CONSISTENT ORDER: Portal → Parent → Category */}
                                    <div className="ml-6 mr-8">
                                      <p className="text-lg font-semibold">
                                        {portal.portalName}
                                      </p>
                                      <p className="text-sm font-medium">
                                        {portal.portalParentCategory}
                                      </p>
                                      <p className="text-xs">
                                        {portal.portalCategoryName}
                                      </p>
                                    </div>
                                  </>
                                ) : (
                                  <div className="mr-8">
                                    {portal.is_manually_added ? (
                                      <>
                                        {/* MANUALLY ADDED - Portal → Parent → Category */}
                                        <p className="text-lg font-semibold">
                                          {portal.portalName}
                                        </p>
                                        <p className="text-sm text-gray-300">
                                          {portal.portalParentCategory}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                          {portal.portalCategoryName}
                                        </p>
                                      </>
                                    ) : categoryHistory.length > 0 ? (
                                      <>
                                        {/* SUBCATEGORY VIEW - Portal → Parent → Subcategory */}
                                        <p className="text-lg font-semibold">
                                          {portal.portalCategoryName}
                                        </p>
                                        <p className="text-sm text-gray-300">
                                          {portal.portalParentCategory}
                                        </p>
                                      </>
                                    ) : (
                                      <>
                                        {/* INITIAL PARENT CATEGORIES - Portal → Category */}
                                        <p className="text-lg font-semibold">
                                          {portal.portalCategoryName}
                                        </p>
                                        <p className="text-sm text-gray-300">
                                          {portal.portalName}
                                        </p>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </section>
              )}
              {showPortalCategoryModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl shadow-lg w-[90%] max-w-2xl p-6 relative">
                    <button
                      className="absolute top-3 right-3 text-gray-500 hover:text-black"
                      onClick={() => {
                        setShowPortalCategoryModal(false);
                        setSelectedPortalForCategories(""); // Clear selected portal
                        setIsSubcategoryView(false); // Reset to category view
                        setPortalCategoriesModal([]); // Clear category/subcategory list
                        setSelectedParentCategory(null); // Clear parent category
                      }}
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <h3 className="text-lg font-semibold mb-4">
                      {!selectedPortalForCategories
                        ? "Select Portal"
                        : isSubcategoryView
                        ? "Select Subcategory"
                        : "Select Category"}
                    </h3>

                    {/* Portal selector */}
                    {formData.master_category && showPortalCategoryModal && (
                      <select
                        className="border p-2 rounded w-full mb-3"
                        value={selectedPortalForCategories}
                        onChange={(e) => {
                          setSelectedPortalForCategories(e.target.value);
                          setCategoryPage(1);
                        }}
                      >
                        <option value="">Select Portal</option>
                        {portalLoading ? (
                          <option>Loading...</option>
                        ) : (
                          portalList.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))
                        )}
                      </select>
                    )}
                    {isSubcategoryView && (
                      <button
                        type="button"
                        className="mb-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1"
                        onClick={async () => {
                          setIsSubcategoryView(false);
                          setCategoryPage(1);
                          // Reload parent categories
                          const res = await fetchPortalParentCategories(
                            selectedPortalForCategories,
                            1
                          );
                          const categories =
                            res?.data?.data?.parent_categories || [];
                          // Remove any 'selected' property and ensure clean data
                          const cleanCategories = categories.map((cat) => ({
                            parent_name: cat.parent_name,
                            parent_external_id: cat.parent_external_id,
                          }));
                          setPortalCategoriesModal(cleanCategories);
                        }}
                      >
                        ← Back to Categories
                      </button>
                    )}
                    {/* Category list */}
                    {portalCategoriesModal.length > 0 ? (
                      <ul className="max-h-60 overflow-y-auto border rounded p-2">
                        {portalCategoriesModal.map((cat) => (
                          <li
                            key={cat.parent_external_id || cat.external_id}
                            className="p-2 border-b text-sm flex items-center justify-between cursor-pointer hover:bg-gray-50"
                            onClick={async () => {
                              if (!isSubcategoryView) {
                                // Fetch subcategories when parent is clicked
                                try {
                                  const subCatRes =
                                    await fetchSubCategoriesByParent(
                                      selectedPortalForCategories,
                                      cat.parent_external_id
                                    );
                                  const subcats =
                                    subCatRes?.data?.data?.categories || [];

                                  if (subcats.length > 0) {
                                    setPortalCategoriesModal(subcats);
                                    setIsSubcategoryView(true);
                                    setSelectedParentCategory(cat);
                                  } else {
                                    toast.info("No subcategories found");
                                  }
                                } catch (err) {
                                  console.error(
                                    "Error fetching subcategories:",
                                    err
                                  );
                                  toast.error("Failed to load subcategories");
                                }
                              }
                            }}
                          >
                            <label
                              className="flex items-center gap-2 cursor-pointer w-full"
                              onClick={(e) => {
                                if (isSubcategoryView) {
                                  e.stopPropagation();
                                }
                              }}
                            >
                              {isSubcategoryView && (
                                <input
                      type="checkbox"
                      checked={cat.selected || false}
                      onChange={(e) => {
                        e.stopPropagation();
                        const isChecked = e.target.checked;
                        // Single select: uncheck all others when checking one
                        setPortalCategoriesModal((prev) =>
                          prev.map((c) => ({
                            ...c,
                            selected: c.external_id === cat.external_id ? isChecked : false
                          }))
                        );
                      }}
                      className="w-5 h-5 accent-gray-900"
                    />
                              )}
                              <span className="flex-1">
                                <span className="flex-1">
                                  {isSubcategoryView
                                    ? cat.name
                                    : cat.parent_name}
                                </span>
                              </span>
                              {!isSubcategoryView && (
                                <span className="text-xs text-gray-500">→</span>
                              )}
                            </label>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 text-sm text-center mt-2">
                        No categories found
                      </p>
                    )}

                    {/* Save button - only show in subcategory view */}
                    {isSubcategoryView && (
                      <div className="flex justify-end mt-5">
                        <button
                          className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-all shadow-md"
                          onClick={() => {
                            const selectedCats = portalCategoriesModal.filter(
                              (c) => c.selected
                            );
                            if (selectedCats.length === 0) {
                              toast.warning(
                                "Please select at least one subcategory."
                              );
                              return;
                            }

                            // ✅ Get the actual portal name from portalList
                            const selectedPortalData = portalList.find(
                              (p) =>
                                p.id === Number(selectedPortalForCategories)
                            );
                            const actualPortalName =
                              selectedPortalData?.name || "Unknown Portal";

                            setMappedPortals((prev) => {
                                    const updated = [...prev];
                                    selectedCats.forEach((cat) => {
                                      const exists = updated.some(
                                        (p) =>
                                          p.portalName === actualPortalName &&
                                          p.id === cat.id  // ✅ NOW CHECK BY cat.id
                                      );
                                      if (!exists) {
                                        console.log(`✅ Adding subcategory: ${cat.name}, ID: ${cat.id}, external_id: ${cat.external_id}`);
                                       updated.push({
                                    id: cat.id, // use ONLY integer timestamp
                                    portalId: 0, // mark manually added category
                                    portalName: actualPortalName,
                                    portalCategoryName: cat.name,
                                    portalParentCategory: cat.parent_name,
                                    portalCategoryId: cat.external_id,
                                    selected: true,
                                    is_manually_added: true, // ✅ IMPORTANT FIX
                                  });
                                      }
                                    });
                                    return updated;
                                  });

                            toast.success(
                              `${selectedCats.length} subcategor${
                                selectedCats.length > 1 ? "ies" : "y"
                              } added`
                            );

                            // 🔥 RESET MODAL DATA
                            setShowPortalCategoryModal(false);
                            setIsSubcategoryView(false);
                            setSelectedPortalForCategories(""); // Clear selected portal
                            setPortalCategoriesModal([]); // Clear categories list
                            setSelectedParentCategory(null); // Clear parent category
                            setCategoryPage(1); // Reset page to 1
                            setShowPortalSection(true);
                          }}
                        >
                          Save Selected
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2">
                {/* <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div> */}

                <label className="block text-sm font-semibold text-gray-700 mb-0">
                  Headline <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="headline"
                  value={formData.headline}
                  onChange={handleInputChange}
                  placeholder="Enter compelling headline..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Meta Title *
                  </label>
                  <input
                    type="text"
                    name="meta_title"
                    value={formData.meta_title || ""}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    placeholder="Meta title for SEO"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleSlugChange}
                    placeholder="url-friendly-slug"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all font-mono"
                  />
                  <p className="text-gray-500 text-xs mt-1.5">
                    Auto-generated from meta title but editable
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Short Description *
                </label>
                <textarea
                  name="shortDesc"
                  value={formData.shortDesc}
                  onChange={handleInputChange}
                  rows="3"
                  maxLength="160"
                  placeholder="Brief summary of the article (max 160 characters)..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  required
                />
                <p className="text-gray-500 text-xs mt-1.5 text-right">
                  {formData.shortDesc.length}/160 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Content *
                </label>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <CKEditor
                    key={editorKey}
                    scriptUrl="/ckeditor/ckeditor.js"
                    initData={formData.longDesc}
                    onBeforeLoad={(CKEDITOR) => {
                      CKEDITOR.disableAutoInline = true;
                      document.body.setAttribute("contenteditable", "false");
                      document.body.style.caretColor = "transparent";
                    }}

                    config={{
                      height: 400,
                      versionCheck: false,
                      removePlugins: "easyimage,cloudservices",
                      extraPlugins: "widget,justify,colorbutton,font",
                      autoGrow_minHeight: 300,
                      autoGrow_maxHeight: 600,
                      contentsCss: "/ckeditor/contents.css",
                      language: "en",
                      skin: "moono-lisa,/ckeditor/skins/moono-lisa/",
                      toolbar: [
                        {
                          name: "document",
                          items: ["Source", "-", "Preview", "Print"],
                        },
                        {
                          name: "clipboard",
                          items: ["Cut", "Copy", "Paste", "-", "Undo", "Redo"],
                        },
                        {
                          name: "editing",
                          items: ["Find", "Replace", "-", "SelectAll"],
                        },
                        {
                          name: "insert",
                          items: [
                            "Image",
                            "Table",
                            "HorizontalRule",
                            "SpecialChar",
                            "CodeSnippet",
                            "Youtube",
                            "Html5video",
                            "Link",
                            "Unlink",
                            "-",
                          ],
                        },
                        {
                          name: "basicstyles",
                          items: [
                            "Bold",
                            "Italic",
                            "Underline",
                            "Strike",
                            "-",
                            "RemoveFormat",
                          ],
                        },
                        {
                          name: "paragraph",
                          items: [
                            "NumberedList",
                            "BulletedList",
                            "-",
                            "Outdent",
                            "Indent",
                            "-",
                            "Blockquote",
                            "JustifyLeft",
                            "JustifyCenter",
                            "JustifyRight",
                            "JustifyBlock",
                          ],
                        },
                        {
                          name: "styles",
                          items: ["Styles", "Format", "Font", "FontSize"],
                        },
                        { name: "colors", items: ["TextColor", "BGColor"] },
                        { name: "tools", items: ["Maximize"] },
                      ],
                    }}
                    onChange={(event) => {
                      const data = event.editor.getData();
                      setFormData((prev) => ({ ...prev, longDesc: data }));
                    }}
                  />
                </div>
              </div>
            </section>

            {/* Featured Image Section */}
            <section className="space-y-5">
              <div className="flex items-center space-x-2 pb-3 border-b-2 border-gray-200">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <ImageIcon className="w-5 h-5 text-gray-700" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Featured Image *
                </h2>
              </div>

              {imagePreview ? (
                <div className="relative group">
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="absolute top-1/2 left-1/2 w-auto h-full max-w-full max-h-full object-cover -translate-x-1/2 -translate-y-1/2"
                    />

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowCropper(true)}
                        className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100 transition-all flex items-center gap-2 shadow-lg"
                      >
                        <Crop className="w-4 h-4" />
                        Crop & Edit
                      </button>
                      <button
                        type="button"
                        onClick={removeImage}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-800">
                      <strong>Tip:</strong> Hover over the image and click "Crop
                      & Edit" to adjust the image, zoom, rotate, or change
                      aspect ratio
                    </p>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="image-upload"
                  className=" border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer transition-all group"
                >
                  <div className="flex flex-col items-center">
                    <div className="p-4 bg-gray-100 rounded-full group-hover:bg-gray-200 transition-all">
                      <Upload className="w-8 h-8 text-gray-600" />
                    </div>
                    <p className="text-base font-medium mt-4 text-gray-700">
                      Click to upload image
                    </p>
                    <p className="text-sm mt-2 text-gray-500">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}

              {/* Cropper Modal */}
              {showCropper && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
                  <div className="bg-white w-full max-w-4xl rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                      <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                        <Crop className="w-4 h-4 sm:w-5 sm:h-5" />
                        Crop & Edit Image
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowCropper(false)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
                      >
                        <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </button>
                    </div>

                    {/* Cropper Section */}
                    <div className="relative w-full flex-1 min-h-[300px] sm:min-h-[400px] md:min-h-[500px] bg-gray-900">
                      <Cropper
                        image={cropPreview}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspect}
                        rotation={rotation}
                        showGrid={true}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                        onRotationChange={setRotation}
                        cropShape="rect"
                        style={{
                          containerStyle: {
                            backgroundColor: "#111827",
                          },
                        }}
                      />
                    </div>

                    {/* Controls */}
                    <div className="p-4 sm:p-6 bg-gray-50 space-y-5 overflow-y-auto">
                      {/* Zoom and Rotate */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <ZoomIn className="w-4 h-4" />
                            Zoom
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="3"
                            step="0.1"
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-gray-900"
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <RotateCw className="w-4 h-4" />
                            Rotate
                          </label>
                          <input
                            type="range"
                            min="-180"
                            max="180"
                            step="1"
                            value={rotation}
                            onChange={(e) =>
                              setRotation(Number(e.target.value))
                            }
                            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-gray-900"
                          />
                        </div>
                      </div>

                      {/* Aspect Ratio */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                          <Maximize2 className="w-4 h-4" />
                          Aspect Ratio
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { label: "Free", value: null },
                            { label: "1:1", value: 1 },
                            { label: "4:3", value: 4 / 3 },
                            { label: "16:9", value: 16 / 9 },
                            { label: "3:4", value: 3 / 4 },
                            { label: "9:16", value: 9 / 16 },
                          ].map(({ label, value }) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() => setAspect(value)}
                              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                                aspect === value
                                  ? "bg-gray-900 text-white shadow-lg"
                                  : "bg-white text-gray-700 border border-gray-300 hover:border-gray-400"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t">
                        <button
                          type="button"
                          onClick={() => setShowCropper(false)}
                          className="w-full sm:w-auto px-5 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={applyCrop}
                          className="w-full sm:w-auto px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-all shadow-lg"
                        >
                          Apply Changes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
            
            {showPortalSection && mappedPortals.length > 0 && !distId && (
  <section className="space-y-5">
    <div className="flex items-center justify-between pb-3 border-b-2 border-gray-200">
      <div className="flex items-center space-x-2">
        <div className="p-2 bg-gray-100 rounded-lg">
          <ImageIcon className="w-5 h-5 text-gray-700" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Portal-Specific Images
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload custom images for each portal (optional)
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={!isCrossMappingChecked || isPublished}
        onClick={() => setShowPortalImageUpload(prev => !prev)}
        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all
          ${isCrossMappingChecked && !isPublished
            ? "bg-gray-900 text-white hover:bg-gray-800"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"}
        `}
      >

      {showPortalImageUpload ? (
        <>
          <Eye className="w-4 h-4" />
          Hide
        </>
      ) : (
        <>
          <Upload className="w-4 h-4" />
          Upload Images
        </>
      )}
    </button>


    </div>

      {showPortalImageUpload && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mappedPortals
            .filter(portal => portal.selected && (portal.portalId || portal.is_manually_added))
            .map((portal, idx) => (
              <div
                key={idx}
                className="border-2 border-gray-200 rounded-xl p-4 bg-white hover:shadow-md transition-all"
              >
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {portal.portalName}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {portal.portalCategoryName}
                  </p>
                </div>

                {portalImagePreviews[portal.portalId] ? (
                  <div className="relative group">
                    <div className="aspect-video rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={portalImagePreviews[portal.portalId]}
                        alt={`${portal.portalName} preview`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removePortalImage(portal.portalId)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="mt-2 text-xs text-gray-600 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      {portalImages[portal.portalId]?.name}
                    </div>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-all">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-600 font-medium">
                        Click to upload
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        PNG, JPG up to 10MB
                      </p>
                    </div>
                    <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handlePortalImageUpload(portal.portalId, e.target.files[0])
                          }
                          className="hidden"
                        />
                  </label>
                )}
              </div>
            ))}
        </div>
      )}

            {Object.keys(portalImages).length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    {Object.keys(portalImages).length} portal image{Object.keys(portalImages).length > 1 ? 's' : ''} ready to upload
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    These images will be uploaded automatically after publishing the article
                  </p>
                </div>
              </div>
            )}
          </section>
        )}
            <section className="space-y-5">
               {/* Portal-Specific Images Section */}
        
              {/* Header */}
              <div className="flex items-center space-x-2 pb-3 border-b-2 border-gray-200">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Tag className="w-5 h-5 text-gray-700" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Tags</h2>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Add Custom Tag */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Custom Tag
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={handleTagKeyPress}
                      placeholder="Enter custom tag..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-4 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>

                {/* Select Existing Tag */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Existing Tag
                  </label>
                  <input
                    type="text"
                    value={tagSearchQuery}
                    ref={tagInputRef}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    onFocus={() => setShowTagDropdown(true)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Click to search and select tags..."
                    disabled={isTagsLoading}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />

                  {showTagDropdown && !isTagsLoading && (
                    <>
                      {/* Backdrop to close dropdown */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => {
                          setShowTagDropdown(false);
                          setTagSearchQuery("");
                        }}
                      />

                      {/* Dropdown */}
                      <div
                        className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {filteredTags.length > 0 ? (
                          filteredTags.map((tag) => (
                            <div
                              key={tag.slug}
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData((prev) => ({
                                  ...prev,
                                  tags: [...prev.tags, tag.name],
                                }));
                                setTagSearchQuery("");
                                // Keep focus on input after selection
                                setTimeout(
                                  () => tagInputRef.current?.focus(),
                                  0
                                ); // ← THIS LINE HERE
                              }}
                              className="px-4 py-3 hover:bg-gray-100 cursor-pointer transition-all border-b border-gray-100 last:border-b-0"
                            >
                              <span className="text-sm text-gray-800 font-medium">
                                {tag.name}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            {tagSearchQuery
                              ? "No matching tags found"
                              : "All tags selected or no tags available"}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Display Selected Tags */}
              {formData.tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Tags ({formData.tags.length})
                  </label>

                  {/* Tag Pills */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.tags.map((tag, i) => {
                      const tagData = availableTags.find((t) => t.id === tag);
                      const displayName = tagData ? tagData.name : tag;
                      return (
                        <span
                          key={i}
                          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-sm"
                        >
                          <span>#{displayName}</span>
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:bg-white/20 rounded p-0.5 transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>

                  {/* Comma-separated tag list */}
                  <div className="text-sm text-gray-800 font-medium">
                    {formData.tags
                      .map((tag) => {
                        const tagData = availableTags.find((t) => t.id === tag);
                        const name = tagData ? tagData.name : tag;
                        return `#${name}`;
                      })
                      .join(", ")}
                  </div>
                </div>
              )}
            </section>

            {/* Publishing Options */}
            <section className="space-y-5">
              <div className="flex items-center space-x-2 pb-3 border-b-2 border-gray-200">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Star className="w-5 h-5 text-gray-700" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Publishing Options
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { key: "latestNews", label: "Latest News", icon: Clock },
                  { key: "headlines", label: "Headlines", icon: FileText },
                  { key: "articles", label: "Articles", icon: FileText },
                  { key: "trending", label: "Trending", icon: TrendingUp },
                  {
                    key: "breakingNews",
                    label: "Breaking News",
                    icon: AlertCircle,
                  },
                  {
                    key: "upcomingEvents",
                    label: "Upcoming Events",
                    icon: Calendar,
                  },
                ].map(({ key, label, icon: Icon }) => (
                  <label
                    key={key}
                    className={`flex items-center space-x-3 border-2 p-4 rounded-xl cursor-pointer transition-all ${
                      formData[key]
                        ? "bg-gray-900 border-gray-900 text-white shadow-lg"
                        : "bg-white border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name={key}
                      checked={formData[key]}
                      onChange={handleInputChange}
                      className="w-5 h-5 rounded accent-gray-900"
                    />
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{label}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Event Details */}
            {formData.upcomingEvents && (
              <section className="space-y-5 bg-blue-50 p-6 rounded-xl border-2 border-blue-200">
                <h3 className="text-base font-semibold text-gray-900 flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span>Event Details</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Start Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      name="eventStartDate"
                      value={formData.eventStartDate}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      End Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      name="eventEndDate"
                      value={formData.eventEndDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Scheduling & Settings */}
            <section className="space-y-5">
              <div className="flex items-center space-x-2 pb-3 border-b-2 border-gray-200">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Clock className="w-5 h-5 text-gray-700" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Scheduling & Settings
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Schedule Date
                  </label>
                  <input
                    type="datetime-local"
                    name="scheduleDate"
                    value={formData.scheduleDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Counter
                  </label>
                  <input
                    type="number"
                    name="counter"
                    value={formData.counter}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Display Order
                  </label>
                  <input
                    type="number"
                    name="order"
                    value={formData.order}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    placeholder="0"
                  />
                </div>
              </div>
            </section>

            {/* Submit Actions - Updated button text */}
            <div className="flex justify-end space-x-3 pt-6 border-t-2 border-gray-200">
  <button
    type="button"
    onClick={resetForm}
    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
  >
    Reset Form
  </button>

  {!isDistributedEdit && (
    <button
      type="button"
      disabled={isLoading}
      onClick={(e) => handleSubmit(e, "DRAFT")}
      className="px-8 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg text-xs font-semibold hover:from-gray-600 hover:to-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg"
    >
      <SaveAll className="w-4 h-4 mr-2" />
      Save as Draft
    </button>
  )}

  {/* Publish Article (normal) */}
  {!isDistributedEdit && (
    <button
      type="button"
      disabled={isLoading}
      onClick={(e) => handleSubmit(e, "PUBLISHED")}
      className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-500 text-white rounded-lg text-sm font-semibold hover:from-gray-500 hover:to-gray-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg"
    >
      {isLoading ? (
        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <>
          <Save className="w-5 h-5 mr-2" />
          Publish Article
        </>
      )}
    </button>
  )}

  {/* Background Publish (primary CTA) */}
  {!isDistributedEdit && (
    <button
      type="button"
      disabled={isLoading}
      onClick={handleBackgroundPublish}
      className="px-8 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-lg text-sm font-semibold hover:from-gray-800 hover:to-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg"
    >
      {isLoading ? (
        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <>
          <RefreshCw className="w-5 h-5 mr-2" />
          Background Publish
        </>
      )}
    </button>
  )}

  {/* Distributed edit */}
  {isDistributedEdit && (
    <button
      type="button"
      disabled={isLoading}
      onClick={(e) => handleSubmit(e, "PUBLISHED")}
      className="px-8 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-lg text-sm font-semibold hover:from-gray-800 hover:to-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg"
    >
      {isLoading ? (
        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <>
          <Save className="w-5 h-5 mr-2" />
          Update & Publish
        </>
      )}
    </button>
  )}
</div>
          </form>
        </div>
      </div>
      {showDrafts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative">
            <button
              onClick={() => setShowDrafts(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
            >
              ✕
            </button>

            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-700" />
              Select a Draft to Edit
            </h2>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {drafts.length > 0 ? (
                drafts.map((draft) => (
                  <div
                    key={draft.id}
                    onClick={() => handleSelectDraft(draft)}
                    className="p-4 border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer transition"
                  >
                    <p className="font-medium text-gray-800">{draft.title}</p>
                    <p className="text-xs text-gray-500">
                      Created: {new Date(draft.created_at).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 font-semibold">
                      Status: {draft.status}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No drafts found.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {showPublishWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-center mb-4 text-amber-500">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
              Not Recommended Method
            </h3>
            
            <p className="text-gray-600 text-center text-sm mb-6">
              This is not the recommended way to publish news. Use <strong>New Background Publish</strong> to publish news. Use this way only when background publish news is not working.
            </p>

            <div className="flex flex-col gap-3">
              {/* RED BUTTON: FORCED ACTION */}
              <button
                onClick={(e) => {
                  setShowPublishWarning(false);
                  handleSubmit(e, "PUBLISHED");
                }}
                className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-md"
              >
                Publish Anyway with this method
              </button>
              
              {/* LIGHT GREEN BUTTON: SAFE ACTION */}
              <button
                onClick={() => setShowPublishWarning(false)}
                className="w-full py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 border border-green-200 transition-colors"
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

export default NewsArticleForm;
