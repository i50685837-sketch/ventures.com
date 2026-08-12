/* =========================================
   VENTURES LOGOUT
========================================= */

async function logoutUser() {

    const token =
        localStorage.getItem("ventures_token");


    /* Tell backend about logout */

    if (token) {

        try {

            await fetch("/api/auth/logout", {

                method: "POST",

                headers: {
                    "Authorization":
                        "Bearer " + token,
                    "Content-Type":
                        "application/json"
                }

            });

        } catch (error) {

            console.log(
                "Backend logout request failed."
            );

        }
    }


    /* Remove authentication */

    localStorage.removeItem(
        "ventures_token"
    );

    localStorage.removeItem(
        "ventures_user"
    );


    /* Clear temporary session data */

    sessionStorage.clear();


    /* Redirect to login */

    window.location.replace(
        "/login.html"
    );
}


/* =========================================
   AUTO LOGOUT
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        logoutUser();

    }
);
