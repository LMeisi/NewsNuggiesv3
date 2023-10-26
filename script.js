// Import API URL from config
import { API_URL_SEARCH } from "./config.js";
// Import API Key from config
import { API_KEY } from "./config.js";
// Import timeout secs used in timeout function from config
import { TIMEOUT_SEC } from "./config.js";
// Import timeout secs used in timeout function from config
import { RES_PER_PAGE } from "./config.js";
// Import Timeout function from helpers.js
import { timeout } from "./helpers.js";

// Element Definitions
const searchButton = document.querySelector(".search__btn");

// Search Results Pane
const searchField = document.querySelector(".search__field"); // Search input field
const searchResults = document.querySelector(".search-results"); // Search Results Pane
const results = document.querySelector(".results"); // Search results
const resultsOptions = document.querySelector(".results-options"); // sorting options container
const pagination = document.querySelector(".pagination"); // pagination container
const news = document.querySelector(".news"); // news pane
// const errorSearch = document.querySelector(".error-search");
// const spinnerSearch = document.querySelector(".spinner-search");

// *********** Global State Variables
// Search button click State: If it's search by 'search button' click, variable is true, otherwise (if clicking on sort buttons), false; default to true
let searchBtnClick = true;

// ********** State object - Object that contains the data for the current search query and results
// Consider updating/clearing every time 'search' button is clicked?
const state = {
  news: {}, // Pick and Copy from state.search.resultsToRender array based on some form of id (what?)
  search: {
    query: "",
    totalResults: 0, // Number of total search results for the query
    resultsToDisplay: [], // Results (articles) actually received on query and to be displayed on page, a chosen result will be copied into the state.news object
    page: 1, //state variable for current page number (that's being displayed), pagination will use this variable
    resultsPerPage: RES_PER_PAGE, // 'resultsPerPage' is how many results we want shown on one page of search results, get it from config.js (RES_PER_PAGE)
    sortBy: "published_desc", // By default, set search results to sort by publishing date in decending order (from latest)
  },
  bookmarks: [],
};

// *********************************
// Function: Get Query: Function to return search input value
function getQuery() {
  // Store input value to 'query'
  const inputQuery = searchField.value;

  // Store query into state object
  state.search.query = inputQuery;

  // Clear input value
  clearInput();

  return inputQuery;
}

// Function: Clear Input: Function to clear input value
function clearInput() {
  document.querySelector(".search__field").value = "";
}

// Function: Load search results: pass in a string (input query) & page number, use it to fetch data, and store results and search metadata in state object
const loadSearchResults = async function (
  query = state.search.query,
  pageNum = state.search.page
) {
  try {
    // Check if it's search button click, if so, assign 'published_desc' to search results; Otherwise, do nothing.
    if (searchBtnClick) {
      state.search.sortBy = "published_desc";
    }
    // Test sort options
    console.log(state.search.sortBy);

    // If fetch takes too long, return error
    // Use current sortBy and resultsPerPage values in state object

    // News API
    // const response = await Promise.race([
    //   fetch(
    //     `https://newsapi.org/v2/everything?q=${query}&sortBy=${state.search.sortBy}&pageSize=${state.search.resultsPerPage}&page=${pageNum}&apiKey=${API_KEY}`
    //   ),
    //   timeout(TIMEOUT_SEC),
    // ]);

    // Media stack API  https://mediastack.com/documentation
    // sort options: published_desc (default), published_asc, popularity
    // country options; &countries=us,ca
    // language options: &languages=en,-de

    // Calculate Offset Value - Offset value is the index of where the first result to be displayed in all results is located
    const offsetVal = (pageNum - 1) * state.search.resultsPerPage;
    console.log(offsetVal);

    const response = await Promise.race([
      fetch(
        `http://api.mediastack.com/v1/news?access_key=${API_KEY}&keywords=${query}&sort=${state.search.sortBy}&offset=${offsetVal}&limit=${state.search.resultsPerPage}&languages=en&countries=us,ca`
      ),
      timeout(TIMEOUT_SEC),
    ]);

    // http://api.mediastack.com/v1/news?access_key=${API_KEY}&keywords=${query}

    // Convert JSON to javascript object using json()
    // Data only contains the chosen results on selected page
    const data = await response.json();
    console.log(response);
    console.log(data);
    console.log(data.data);
    // console.log(data.articles[0].content); // Below data only for own understanding
    // console.log("Total Results:", data.totalResults);
    // console.log("Title:", data.articles[0].title);

    // If response status isn't OK, throw new error()
    // NOTE: If no results are returned, no error will be thrown, empty results array will be saved to search results. When render, this error will be guarded and checked to print error message
    if (!response.ok) throw new Error(`${response.status}: ${data.message}`);

    // Save articles to state object (below way not needed, just save data.article directly into resultsToDisplay object)
    // Convert(map) the each 'article' object into the object of your own format
    // state.search.resultsToDisplay = data.articles.map((art) => {
    //   return {
    //     title: art.title, // article title
    //     url: art.url, // article address
    //     urlToImage: art.urlToImage, // article image
    //     source: art.source.name, // e.g. a website name
    //     publishedAt: art.publishedAt, // time of publish
    //   };
    // });

    // Save the articles object into state object
    state.search.resultsToDisplay = data.data;
    // assign totalResults property to state object
    state.search.totalResults = data.pagination.total;
    // assign query property to state object
    state.search.query = query;
    // Set page number to current page
    state.search.page = pageNum;

    // Checking state object
    console.log(state);
    console.log(state.search.resultsToDisplay);
    console.log("Source name:", state.search.resultsToDisplay[0].source);
    console.log("Sort by:", state.search.sortBy);
    console.log("query:", state.search.query);
    console.log("page:", state.search.page);

    // What does it return? Looks program is the same if I don't specify 'return' below (?)
    return state.search.resultsToDisplay;
  } catch (err) {
    //Temp error handling
    console.error(`${err}🩳🩳`);

    // return err
    throw err;
  }
};

// ********************************* RESULTS PANE RENDER FUNCTIONS
// Function: Render Search Results ('data' argument passed in is state.search)
function renderSearchResults(data) {
  // Clear results, resultOptions, pagination, also: error/spinner if available
  clearSearchResults();

  // ***START HERE:Check again to see if works
  // Guard Clause, if returned results are empty (no results returned), render error
  if (data.resultsToDisplay.length == 0) {
    renderErrorSearchResults();
  }

  // checking
  console.log(data.resultsToDisplay);

  // Generate markup for each search result, map and join them into one html code string
  // NOTE::: <!-- Using the fade out way to fade out multiple line truncation for result.title: https://css-tricks.com/line-clampin/ -->
  // Use moment.js here moment(result.publishedAt).fromNow() to get the time difference from publishedAt till now. moment.js API takes in the format directly and spits out '... ago'
  const resultsMarkup = data.resultsToDisplay
    .map((result, index) => {
      // Fit the format so moment.js could be used
      const resultPubTime = result.published_at.substring(0, 19) + "Z";

      // Create two different markups with Image either available or not available, then use those variables in below generated markup in the ternary operation (?)
      const markupWithImage = `
      <!-- Col containing source and title - flexbox -->
      <div class="preview-data col-8 d-flex flex-column">
        <p class="preview__publisher">${result.source}</p>
        <h4 class="preview__title">
          ${result.title}
        </h4>
      </div>
      <!-- Col containing url img -->
      <div
        class="preview-fig-container col-4 d-flex justify-content-end"
      >
        <figure class="preview__fig">
          <img
            src="${result.image}"
            alt="newsImg"
          />
        </figure>
      </div>`;

      const markupWithoutImage = `
      <!-- Col containing source and title - flexbox -->
      <div class="preview-data col-12 d-flex flex-column">
        <p class="preview__publisher">${result.source}</p>
        <h4 class="preview__title">
          ${result.title}
        </h4>
      </div>
      `;

      // return generated markup, note the ternary operation based on image availability
      return `<li class="preview" data-index="${index}">
              <a class="preview__link" href="">
                <!-- Flexbox Vertical -->
                <div class="preview-container d-flex flex-column">
                  <!-- Top grid -->
                  <div class="preview-info row">
                    ${result.image ? markupWithImage : markupWithoutImage}
                  </div>
                  <!-- Bottom grid -->
                  <div class="preview-support-info row align-items-center">
                    <!-- Published time from now -->
                    <div class="preview-pub-time-container col-8">
                      <p class="preview-pub-time">${moment(
                        resultPubTime
                      ).fromNow()}</p>
                    </div>
                    <!-- Bookmark? -->
                    <div
                      class="preview-bookmark-container col-4 d-flex justify-content-end"
                    >
                      <button class="btn--round btn-round-preview" type="button">
                        <svg class="">
                          <use href="img/icons.svg#icon-bookmark-fill"></use>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </a>
            </li>`;
    })
    .join("");

  // render results
  results.insertAdjacentHTML("afterbegin", resultsMarkup);

  // render results options container
  renderResultsOptions(data.totalResults, data.resultsPerPage, data.page);

  // Render Pagination, pass in current page number (state.search.page)
  renderPagination(data.totalResults, data.resultsPerPage, data.page);
}

// Renders result options container (used for when rendering search results)
function renderResultsOptions(totalResults, resultsPerPage, curPage) {
  const optionsMarkup = `
    <!-- results totals container-->
    <div class="results-total-container">
      <div class="results-total d-flex align-items-center">
        <p class="results-total-title me-2 mb-1">Total Results:</p>
        <p class="results-total-num me-5 mb-0 fw-bold fst-italic">${totalResults}</p>
        <p class="results-total-page me-2 mb-0">Total Pages:</p>
        <p class="results-total-page-num me-5 mb-0 fw-bold fst-italic">${Math.ceil(
          totalResults / resultsPerPage
        )}</p>
        <p class="results-total-page me-2 mb-0">Page:</p>
        <p class="results-total-num mb-0 fw-bold fst-italic">${curPage}</p>
      </div>
    </div>
    <!-- "sort by" -->
    <div class="sort-title col-5">
      <p>Sort by:</p>
    </div>
    <!-- sort options -->
    <div class="sort-container col-7 d-flex justify-content-around">
      <div class="sort-option sort-option-relevancy">
        <button class="btn-sort sort-btn-published-desc sort-active text-decoration-none bg-transparent border-0" type="button">
          <p class="fst-italic">Most Recent</p>
        </a>
      </div>
      <div class="sort-option sort-option-publishedat">
        <button class="btn-sort sort-btn-published-asc text-decoration-none bg-transparent border-0" type="button">
          <p class="fst-italic">Oldest</p>
        </a>
      </div>
      <div class="sort-option sort-option-popularity">
        <button class="btn-sort sort-btn-published-popularity text-decoration-none bg-transparent border-0" type="button">
          <p class="fst-italic">Popularity</p>
        </a>
      </div>`;

  resultsOptions.insertAdjacentHTML("afterbegin", optionsMarkup);
}

// Function: Render Spinner for Search Results
function renderSpinnerSearchResults() {
  // Clear search results pane
  clearSearchResults();

  const markup = `
      <div class="spinner spinner-search">
        <svg>
          <use href="img/icons.svg#icon-loader"></use>
        </svg>
      </div>`;

  // render spinner
  searchResults.insertAdjacentHTML("afterbegin", markup);
}

// Function: Render Error messages for search results
// If no argument passed, use default message
function renderErrorSearchResults(
  errorMsg = "No news found for your query! Please try another one!"
) {
  // Error Msg check
  console.log(errorMsg);

  // Generate markup
  const errorMarkup = `
      <div class="error error-search">
        <div>
          <svg>
            <use href="img/icons.svg#icon-alert-triangle"></use>
          </svg>
        </div>
        <p>${errorMsg}</p>
      </div>
    `;

  // Clear sorting options container and search results & pagination - Not needed, renderSearchResults already cleared it

  // render error message
  searchResults.insertAdjacentHTML("afterbegin", errorMarkup);
}

// Function: Render Pagination based on current page displayed
function renderPagination(totalResults, resultsPerPage, curPage) {
  // Total number of pages to be displayed for this particular search
  const numPages = Math.ceil(totalResults / resultsPerPage);
  console.log(numPages);

  // Use data attribute 'data-goto' to denote what page the button click to go to (internally for JS to understand)
  // Without data attribute, we wouldn't know which button refers to which page (internally)

  // Case 1: if on Page 1, and there are other pages - display next page button only
  if (curPage === 1 && numPages > 1) {
    const markup = `
        <!-- Empty space  -->
        <div class="col-4"></div>
        <div class="col-4"></div>
        <!-- Next page button  -->
        <button data-goto="${
          curPage + 1
        }" class="btn--inline col-4 pagination__btn--prev justify-content-center" type="button">
          <span>Page ${curPage + 1}</span>
          <ion-icon name="arrow-forward-outline"></ion-icon>
        </button>
        `;

    pagination.insertAdjacentHTML("afterbegin", markup);
  }

  // Case 2: if on Last Page - if current page is equal to num of pages - only display previous page button
  else if (curPage === numPages && numPages > 1) {
    const markup = `
        <!-- Next page button  -->
        <button data-goto="${
          curPage - 1
        }" class="btn--inline col-4 pagination__btn--next justify-content-center" type="button">
          <ion-icon name="arrow-back-outline"></ion-icon>
          <span>Page ${curPage - 1}</span>
        </button>
        <!-- Empty space  -->
        <div class="col-4"></div>
        <div class="col-4"></div>
        `;

    pagination.insertAdjacentHTML("afterbegin", markup);
  }

  // Case 3: if on Other pages - display both previous and next pages buttons
  else if (curPage < numPages) {
    const markup = `
        <!-- Prev page button  -->  
        <button data-goto="${
          curPage - 1
        }" class="btn--inline col-4 pagination__btn--prev justify-content-center" type="button">
          <ion-icon name="arrow-back-outline"></ion-icon>
          <span>Page ${curPage - 1}</span>
        </button>
        <!-- Empty space  -->
        <div class="col-4"></div>
        <!-- Next page button  -->
        <button data-goto="${
          curPage + 1
        }" class="btn--inline col-4 pagination__btn--next justify-content-center" type="button">
            <span>Page ${curPage + 1}</span>
            <ion-icon name="arrow-forward-outline"></ion-icon>
        </button>
        `;

    pagination.insertAdjacentHTML("afterbegin", markup);
  }

  // Case 4: if on Page 1, and there are NO other pages
  else {
  } // Don't append any HTML
}

// Function: Clear Search results: results, resultOptions, pagination, also: error/spinner if available
function clearSearchResults() {
  // Clear results and resultsOptions and pagination containers
  results.innerHTML = "";
  resultsOptions.innerHTML = "";
  pagination.innerHTML = "";

  // If error/spinner exists, remove them
  if (document.querySelector(".error-search") !== null) {
    document.querySelector(".error-search").remove();
  }
  if (document.querySelector(".spinner-search") !== null) {
    document.querySelector(".spinner-search").remove();
  }
}

// This function will be called when search button is clicked or 'enter' keydown pressed, basically covers most of the operations in above functions
// It includes renderSpinner, loadSearchResults, renderSearchResults, renderErrorSearchResults function etc.
function showSearchResults() {
  // Get query input and save to searchQuery
  let searchQuery = getQuery();
  console.log(searchQuery);

  // guard clause - If no search term, exit and do nothing
  if (searchQuery == "") {
    return;
  }

  // If input exists, set below to true, so when calling loadSearchResults function, sort option will default to 'published_desc'
  searchBtnClick = true;

  // render spinner in search results
  renderSpinnerSearchResults();

  // Use .then to render loaded results
  //  Call async LoadSearchResults, after results come back, then render the results, otherwise, wont work!!!
  // Pass in the search query and page number (default is 1) to save results to state object
  loadSearchResults(searchQuery, 1)
    .then((p) => {
      // p is the returned promise, not sure what it is, but doesn't matter, just need to use then here.
      // Check statements
      console.log(state.search.resultsToDisplay);

      // Clear spinner
      clearSearchResults();
      // Render search results based on resultsToDisplay in state object, render pagination
      // Render doesn't need to be async, all data is already local
      renderSearchResults(state.search);
    })
    .catch((err) => {
      // Clear spinner
      clearSearchResults();

      // If search returns error, loadSearResults will return a Promise with an error as its value, that error is caught and error message will be printed
      console.log(err);
      renderErrorSearchResults();
    });
}

// ********************************* NEWS PANE RENDER FUNCTIONS
// Function: Render error in news pane
function renderErrorNews(
  errorMsg = "We could not find that news. Please try another one!"
) {
  // Error Msg check
  console.log(errorMsg);

  // Generate markup
  const errorMarkup = `
    <div class="error error-news">
      <div>
        <svg>
          <use href="img/icons.svg#icon-alert-triangle"></use>
        </svg>
      </div>
      <p>${errorMsg}</p>
    </div>
  `;

  // Clear sorting options container and search results & pagination - Not needed, renderSearchResults already cleared it

  // render error message
  news.insertAdjacentHTML("afterbegin", errorMarkup);
}

// Function: clear news pane
function clearNews() {
  // Clear results and resultsOptions and pagination containers
  // results.innerHTML = "";
  // resultsOptions.innerHTML = "";
  // pagination.innerHTML = "";

  // // If error/spinner exists, remove them
  // if (document.querySelector(".error-news") !== null) {
  //   document.querySelector(".error-news").remove();
  // }
  // if (document.querySelector(".spinner-news") !== null) {
  //   document.querySelector(".spinner-news").remove();
  // }
  news.innerHTML = "";
}

// ********************************* Event Handlers
// Search button event handler, call showSearchResults() upon click
searchButton.addEventListener("click", showSearchResults);

//Key 'Enter' Event handler, call showSearchResults() upon 'enter' keydown
document.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && searchField.value) {
    showSearchResults();
    e.preventDefault();
  }
});

// EVENT LISTENER: Sort by published-desc click
// NOTE: Vanilla javascript won't work here unless use event.target, jQuery is easier here
$("body").on("click", ".sort-btn-published-desc", function (e) {
  console.log("sort by descending date");

  // Save new sortby value to state object
  state.search.sortBy = "published_desc";

  //  Set below to false, not a search button click, so when loading loadSearchResults function, sort option won't default to 'published_desc'
  searchBtnClick = false;

  // render spinner in search results
  renderSpinnerSearchResults();

  // Same as above, Call async LoadSearchResults, after results come back, then render the results, otherwise, wont work!!!
  // Pass in the search query and page number (default is 1) to save results to state object
  loadSearchResults(state.search.query, state.search.page)
    .then((p) => {
      // p is the returned promise, not sure what it is, but doesn't matter, just need to use then here.
      // Check statements
      console.log(state.search.resultsToDisplay);

      // Clear spinner
      clearSearchResults();
      // Render search results based on resultsToDisplay in state object, render pagination
      // Render doesn't need to be async, all data is already local
      renderSearchResults(state.search);

      // Assign active format class to clicked sort option
      // if sort desc is NOT active, make it active; If active, don't change anything, watch for (!)
      document
        .querySelector(".sort-btn-published-desc")
        .classList.add("sort-active");

      // If sort asc is active, remove the active class; If not, don't change anything
      document
        .querySelector(".sort-btn-published-asc")
        .classList.remove("sort-active");

      // if sort popularity is active, remove the active class; If not, don't change anything
      document
        .querySelector(".sort-btn-published-popularity")
        .classList.remove("sort-active");
    })
    .catch((err) => {
      // Clear spinner
      clearSearchResults();

      // If search returns error, loadSearResults will return a Promise with an error as its value, that error is caught and error message will be printed
      console.log(err);
      renderErrorSearchResults();
    });
});

// EVENT LISTENER: Sort by Date click
$("body").on("click", ".sort-btn-published-asc", function (e) {
  console.log("sort by ascending date");

  // Save new sortby value to state object
  state.search.sortBy = "published_asc";

  //  Set below to false, not a search button click, so when loading loadSearchResults function, sort option won't default to 'published_desc'
  searchBtnClick = false;

  // render spinner in search results
  renderSpinnerSearchResults();

  // Same as above, Call async LoadSearchResults, after results come back, then render the results, otherwise, wont work!!!
  // Pass in the search query and page number (default is 1) to save results to state object
  loadSearchResults(state.search.query, state.search.page)
    .then((p) => {
      // p is the returned promise, not sure what it is, but doesn't matter, just need to use then here.
      // Check statements
      console.log(state.search.resultsToDisplay);

      // Clear spinner
      clearSearchResults();
      // Render search results based on resultsToDisplay in state object, render pagination
      // Render doesn't need to be async, all data is already local
      renderSearchResults(state.search);

      // Assign active format class to clicked sort option
      // if sort desc is active, remove the active class; If not, don't change anything
      document
        .querySelector(".sort-btn-published-desc")
        .classList.remove("sort-active");

      // If asc is NOT active, make it active; If active, don't change anything,, watch for (!)
      document
        .querySelector(".sort-btn-published-asc")
        .classList.add("sort-active");

      // if sort popularity is active, remove the active class; If not, don't change anything
      document
        .querySelector(".sort-btn-published-popularity")
        .classList.remove("sort-active");
    })
    .catch((err) => {
      // Clear spinner
      clearSearchResults();

      // If search returns error, loadSearResults will return a Promise with an error as its value, that error is caught and error message will be printed
      console.log(err);
      renderErrorSearchResults();
    });
});

// EVENT LISTENER: Sort by Popularity click
$("body").on("click", ".sort-btn-published-popularity", function (e) {
  console.log("sort by popularity clicked");

  // Save new sortby value to state object
  state.search.sortBy = "popularity";

  //  Set below to false, not a search button click, so when loading loadSearchResults function, sort option won't default to 'published_desc'
  searchBtnClick = false;

  // render spinner in search results
  renderSpinnerSearchResults();

  // Same as above, Call async LoadSearchResults, after results come back, then render the results, otherwise, wont work!!!
  // Pass in the search query and page number (default is 1) to save results to state object
  loadSearchResults(state.search.query, state.search.page)
    .then((p) => {
      // p is the returned promise, not sure what it is, but doesn't matter, just need to use then here.
      // Check statements
      console.log(state.search.resultsToDisplay);

      // Clear spinner
      clearSearchResults();
      // Render search results based on resultsToDisplay in state object, render pagination
      // Render doesn't need to be async, all data is already local
      renderSearchResults(state.search);

      // if sort desc is active, remove the active class; If not, don't change anything
      document
        .querySelector(".sort-btn-published-desc")
        .classList.remove("sort-active");

      // If asc is active, remove the active class; If not, don't change anything
      document
        .querySelector(".sort-btn-published-asc")
        .classList.remove("sort-active");

      // if sort popularity is NOT active, add the active class; If active, don't change anything,, watch for (!)
      document
        .querySelector(".sort-btn-published-popularity")
        .classList.add("sort-active");
    })
    .catch((err) => {
      // Clear spinner
      clearSearchResults();

      // If search returns error, loadSearResults will return a Promise with an error as its value, that error is caught and error message will be printed
      console.log(err);
      renderErrorSearchResults();
    });
});

// Event Listener: Pagination Controls - have to use jQuery as button doesn't exist upon initial loading of page
$("body").on("click", ".pagination", function (e) {
  //Event Delegation: Select the closest parent element that's of 'btn-inline' class
  //Because there's <span> and ion-icon elements inside the button element, want to make sure every time the button element itself is returned(selected)
  const btn = e.target.closest(".btn--inline");

  //Guard clause for if no btn found (if white space within pagination element clicked), do nothing
  //Without guard clause, error would occur
  if (!btn) return;

  //Retrieve the value of data attribute 'data-goto' in the HTML code for the button element
  //'goToPage' is the value of the page that app should go to
  //convert the value to integer
  const goToPage = +btn.dataset.goto;
  console.log(goToPage);

  //Render new results and render new page

  //  Set below to false, not a search button click, so when loading loadSearchResults function, sort option won't default to 'popularity'
  searchBtnClick = false;

  // render spinner in search results
  renderSpinnerSearchResults();

  // Same as above, Call async LoadSearchResults, after results come back, then render the results, otherwise, wont work!!!
  // Pass in the search query and page number to save results to state object
  loadSearchResults(state.search.query, goToPage)
    .then((p) => {
      // p is the returned promise, not sure what it is, but doesn't matter, just need to use then here.
      // Check statements
      console.log(state.search.resultsToDisplay);

      // Clear spinner
      clearSearchResults();
      // Render search results based on resultsToDisplay in state object, render pagination
      // Render doesn't need to be async, all data is already local
      renderSearchResults(state.search);
    })
    .catch((err) => {
      // Clear spinner
      clearSearchResults();

      // If search returns error, loadSearResults will return a Promise with an error as its value, that error is caught and error message will be printed
      console.log(err);
      renderErrorSearchResults();
    });
});

// Event handler - Clicking on search results (event delegation)
$("body").on("click", ".results", function (e) {
  // Step 1: Locate the clicked element (news) from the resultsToDisplay array using data-index property of the preview element
  // Event Delegation: Select the closest parent element that's of 'preview' class and assign to the 'previewToDisplay" element (newly created)
  const previewToDisplay = e.target.closest(".preview");

  //Guard clause for if no previewToDisplay found, do nothing (for now, impossible)
  //Without guard clause, error would occur
  if (!previewToDisplay) return;

  // Find the dataset index property of the previewToDisplay result, set it to 'resultToDisplayIndex'
  const resultToDisplayIndex = previewToDisplay.dataset.index;

  // Check resultsToDisplay index and the corresponding news result
  console.log(resultToDisplayIndex);
  // console.log(state.search.resultsToDisplay[resultToDisplayIndex]);

  // Save news to display to variable
  const newsToDisplay = state.search.resultsToDisplay[resultToDisplayIndex];
  console.log(newsToDisplay);

  // Step 2: Render the clicked result to news pane
  // Clear current news pane
  clearNews();

  // If news result is NOT valid
  if (
    newsToDisplay.title == "[Removed]" &&
    newsToDisplay.content == "[Removed]" &&
    newsToDisplay.url == "https://removed.com"
  ) {
    // render spinner in news pane
    // renderSpinnerNews();

    // Clear spinner in news pane
    // clearNews();

    // If news result not valid, render error
    renderErrorNews();
  }
  // If news result is valid
  else {
    // render spinner in news pane
    // renderSpinnerNews();

    // Clear spinner in news pane
    // clearNews();

    // render clicked news article
    const markup = `
        <!-- news header -->
        <div class="news-header d-flex flex-column px-5 pt-5 pb-4">
          <!-- source -->
          <div class="news-source-container">
            <p
              class="news-source fs-5 fw-bold align-middle mb-1 text-uppercase"
            >
              ${newsToDisplay.source}
            </p>
          </div>
          <!-- title -->
          <div class="news-title-container">
            <h2 class="news-title fs-1 fw-bold">
              ${newsToDisplay.title}
            </h2>
          </div>
          <!-- news author and publish time -->
          <div class="d-flex news-info-container">
            <!-- author -->
            <div class="news-author-container d-flex fs-5 pe-4">
              <span>By&nbsp;</span>
              <p class="news-author fst-italic">${newsToDisplay.author}</p>
            </div>
            <!-- publish time -->
            <div class="news-pub-time-container d-flex fs-5">
              <span>Updated&nbsp;</span>
              <p class="news-pub-time fst-italic">${newsToDisplay.published_at.substring(
                0,
                4
              )}-${newsToDisplay.published_at.substring(
      5,
      7
    )}-${newsToDisplay.published_at.substring(
      8,
      10
    )}&nbsp;${newsToDisplay.published_at.substring(11, 19)}</p>
            </div>
          </div>
        </div>

        <!-- news img -->
        <div class="news-img-container px-5">
          <img
            class="news-img"
            src="${newsToDisplay.image}"
          />
        </div>

        <!-- news description -->
        <div class="news-description-container px-5 pt-5 pb-4">
          <h4 class="news-description">
           ${newsToDisplay.description}
          </h4>
        </div>

        <!-- news source and bookmark button -->
        <div
          class="news-action-container px-5 pt-1 d-flex justify-content-between align-items-center"
        >
          <a
            class="news-source-btn-link text-decoration-none me-3"
            href="${newsToDisplay.url}" target="_blank"
          >
            <button class="btn news-source-btn ms-1" type="button">
              <!-- <svg class="search__icon">
              <use href="img/icons.svg#icon-search"></use>
            </svg> -->
              <span>See Full Article</span>
            </button>
          </a>
          <a class="news-source-btn-bookmark text-decoration-none me-5" href="">
            <button class="btn--round" type="button">
              <svg class="">
                <use href="img/icons.svg#icon-bookmark-fill"></use>
              </svg>
            </button>
          </a>
        </div>
        `;

    // insert to news pane
    news.insertAdjacentHTML("afterbegin", markup);
  }

  e.preventDefault();
});

// BUGS
// 1. When results return is invalid - especially img, consider replacing img with a custom made local img with logo
// 2. Sometimes when displaying images (or articles), it moves to the left of the container instead of justifying to the end (right side) WHY??? Height? Width? already set width to 100%...
// 3. Some result objects would be "REMOVED", how to actually remove those results from my searach results, e.g. below: (note: sometimes author is null, that's fine, maybe use 'content' or 'title' to check for it)
// {
// author: null
// content: "[Removed]"
// description: "[Removed]"
// publishedAt: "1970-01-01T00:00:00Z"
// source: {id: null, name: '[Removed]'}
// title: "[Removed]"
// url: "https://removed.com"
// urlToImage: null
// }
// 4. Fade out the last line of search results (3 lines total (?))
// 5. Fix the format of sort options, add 'active' class to denote the chosen sort option; align the sort options to the right side with margins, to align with the page number on the top line
// 5m. media query for sort options top line, change it to line by line showing instead of cramming in 1 liner
// 6. Pagination: needs to fix when clicking on different sort option, pagination should start from page 1 again, also check if pagination is working correctly

// Potential Improvements
// 1. Add languages, search in different languages
