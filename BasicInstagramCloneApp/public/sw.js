// This statement is used to import other packages. This simply allows us to point to another script which we want to use in that SW. This
// in general allows to distribute your code across multiple files.
importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

var CACHE_STATIC_NAME = 'static-v2';
var CACHE_DYNAMIC_NAME = 'dynamic-v2';

var STATIC_FILES = 
[
    '/',
    '/index.html',
    '/offline.html',
    '/src/js/app.js',
    '/src/js/utility.js',
    '/src/js/feed.js',
    '/src/js/idb.js',
    '/src/js/promise.js',
    '/src/js/fetch.js',
    '/src/js/material.min.js',
    '/src/css/app.css',
    '/src/css/feed.css',
    '/src/images/main-image.jpg',
    'https://fonts.googleapis.com/css?family=Roboto:400,700',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css'
];

const trimCache = (cacheName, maxItems) =>
{
    console.log("Delete Cache");

    caches.open(cacheName)
    .then(async cache =>
    {
        const keys = await cache.keys();
        
        if(keys.length > maxItems) 
        {
            cache.delete(keys[0])
            .then(trimCache(cacheName, maxItems));
        }
    })
}

const check = url =>
{
    let flag=0;

    for(let i=0; i < STATIC_FILES.length; i++)
    if( STATIC_FILES[i] === url )
    flag=1;

    // console.log("flag",flag," ",url);
    
    return flag;
}

self.addEventListener('install', event => 
{
    console.log('[Service Worker] Installing Service Worker ...', event);

    // caches will wait untill the SW installed properly. caches.open() will create a sub caches in cache storage in the browser. Both
    // add() and addAll() function will store the request-response as key-value pair.
    event.waitUntil(
        caches.open(CACHE_STATIC_NAME)
        .then(cache =>
        {
            console.log("Adding static cache");

            // cache.add('/');
            // cache.add('/index.html');
            // cache.add('/src/js/app.js');

            // We can store request in cache one by one by using add() but we instead we can use addAll(). These files which are being cached
            // are called 'precached file'.
            cache.addAll(STATIC_FILES);
        })
    );
});

self.addEventListener('activate', event => 
{
    console.log('[Service Worker] Activating Service Worker ....', event);

    event.waitUntil(
        caches.keys()
        .then(keyList =>
        {
            console.log("Keylist ", keyList);

            // Promise.all() take an array of promises and waits for all them to finish so that we only return from this function
            // once we are really done with the cleanup
            return Promise.all(keyList.map(key =>
            {
                if(key !== CACHE_STATIC_NAME && key!== CACHE_DYNAMIC_NAME)
                {
                    console.log("Removing old cache key : ",key );
                    
                    return caches.delete(key);
                }
            }))
        })
    )

    return self.clients.claim();
});

// Mix version of Cache then Network strategy
self.addEventListener('fetch', event => 
{
    // console.log('[Service Worker] Fetching something ....', event);

    var url = "https://firstfirebase-3e4d9.firebaseio.com/posts.json";

    if( event.request.url.indexOf(url) > -1 )
    {
        event.respondWith(

            fetch(event.request)
            .then(res =>
            {
                var clonedRes = res.clone();
                
                clearAllData('posts')
                .then(() =>
                {
                    return clonedRes.json();
                })
                .then(data =>
                {
                    for(let key in data)
                    {
                        writeData('posts', data[key])
                        .then(() =>
                        {
                            deleteItemFromData('posts', key);
                        })
                    }   
                })

                console.log("URL : ", res);

                return res;
            })
        );
    }
    else if( check(event.request.url) )
    {
        event.respondWith(
            caches.match(event.request)
        )
    }
    else
    {
        event.respondWith(

            // match() function will search the request in the sub-caches of the cache storage of the give page.
            caches.match(event.request)
            .then(response =>
            {
                if(response)
                return response;
    
                else
                {
                    return fetch(event.request)
                    .then(res =>
                    {
                        return caches.open(CACHE_DYNAMIC_NAME)
                        .then(cache =>
                        {
                            trimCache(CACHE_DYNAMIC_NAME, 5);

                            // put() is same as add() or addAll() but here we have to mention both key and value. First argument is key and 
                            // second one is value. You can use 'res' once only that's why we made a clone of res in place and while returning 
                            // we used an original 'res' variable without cloning as we have never used it before.
                            cache.put(event.request.url, res.clone());
        
                            return res;
                        })
                    })
                    .catch(async error =>
                    {
                        return caches.open(CACHE_STATIC_NAME)
                        .then(cache =>
                        {
                            if( event.request.headers.get('accept').includes('text/html') )
                            return cache.match('/offline.html');
                        })
                    })
                }
            })
        );
    }
});

// Whenever SW thinks it has internet connection and it has an outstanding synchronization task, it will trigger this event. 
self.addEventListener('sync', event =>
{
    console.log('[Service Worker] Background syncing', event);

    if( event.tag === 'sync-new-posts' ) 
    {
        console.log('[Service Worker] Syncing new Posts');

        event.waitUntil(
        
            readAllData('sync-posts')
            .then(data =>
            {
                for(let dt of data) 
                {
                    // postData is a variable of type formData which contains key value pair and can also has a file.
                    var postData = new FormData();

                    postData.append('id', dt.id);
                    postData.append('title', dt.title);

                    postData.append('location', dt.location);
                    postData.append('rawLocationLat', dt.rawLocation.lat);
                    postData.append('rawLocationLng', dt.rawLocation.lng);

                    postData.append('file', dt.picture, dt.id + '.png');

                    // This is the url of cloud functions i.e the endpoint where we are sending the request. Though we can directly do it without 
                    // using cloud functions as we did before. After fetch() it will go to index.js page inside 'functions' folder. And from there
                    // it will again return to the then() block of this fetch() api.
                    fetch('https://us-central1-firstfirebase-3e4d9.cloudfunctions.net/storePostsData', 
                    {
                        method: 'POST',
                        mode: "no-cors",
                        body: postData
                    })
                    .then(res =>
                    {
                        console.log('Sent data', res);

                        if( res.ok ) 
                        {
                            res.json()
                            .then(resData =>
                            {
                                console.log("ResData : ", resData);

                                deleteItemFromData('sync-posts', resData.id);
                            })
                        }
                    })
                    .catch(err =>
                    {
                        console.log('Error while sending data', err);
                    });
                }
            })
        );
    }
})

self.addEventListener('notificationclick', event =>
{
    var notification = event.notification;
    var action = event.action;

    console.log("notificationClick : ",notification);

    if(action === 'confirm') 
    {
        console.log('Confirm was chosen');
        
        // To get rid of the notification i.e to close the notofication from the user's device when the user chooses 'confirm' action. 
        notification.close();
    } 
    else 
    {
        console.log(action);
        
        event.waitUntil(
            
            // clients means all windows or all browsers tasks related to SW.
            clients.matchAll()
            .then(clis =>
            {
                // clis : all the clients that has been found 
                var client = clis.find(eachElement =>
                {
                    // visibilityState === 'visible' means all those browsers that are open with our app loaded in any one of the tabs.
                    return eachElement.visibilityState === 'visible';
                });
                
                if(client !== undefined) 
                {
                    // Ths will laod our application in a tab the user already had open, to not unnecessarily open a new one.
                    client.navigate(notification.data.url);
                    client.focus();
                } 
                else 
                {
                    // If our app is not open or may be whole browser is closed, then it will open our app in new tab or open a new 
                    // browser with our app laoded respectively.
                    clients.openWindow(notification.data.url);
                }

                notification.close();
            })
        );
    }
})

self.addEventListener('notificationclose', event =>
{
    console.log('Notification was closed', event);
})

// Whenever you push a new posts ( see in index.js file where firebase cloud functions are written ).
self.addEventListener('push', event =>
{
    console.log('Push Notification received', event);

    var data = 
    {
        title: 'New!', 
        content: 'Something new happened !!', 
        openUrl: '/'
    };

    if(event.data)
    data = JSON.parse(event.data.text());

    var options = 
    {
        body: data.content,
        icon: '/src/images/icons/app-icon-96x96.png',
        badge: '/src/images/icons/app-icon-96x96.png',
        data: 
        {
            url: data.openUrl
        }
    };

    event.waitUntil(
        
        // Remember active SW itself can't show the notification it's there to listen to events. That's why we have to get access to 
        // the registration of the SW that is the part running in the browser. It's a part that connect SW to the browser. 
        self.registration.showNotification(data.title, options)
    );
});

// self.addEventListener('fetch', event => 
// {
//     // console.log('[Service Worker] Fetching something ....', event);

//     event.respondWith(

//         // match() function will search the request in the sub-caches of the cache storage of the give page.
//         caches.match(event.request)
//         .then(response =>
//         {
//             if(response)
//             return response;

//             else
//             {
//                 return fetch(event.request)
//                 .then(res =>
//                 {
//                     return caches.open(CACHE_DYNAMIC_NAME)
//                     .then(cache =>
//                     {
//                         // put() is same as add() or addAll() but here we have to mention both key and value. First argument is key and 
//                         // second one is value. You can use 'res' once only that's why we made a clone of res in place and while returning 
//                         // we used an original 'res' variable without cloning as we have never used it before.
//                         cache.put(event.request.url, res.clone());

//                         return res;
//                     })
//                 })
//                 .catch(error =>
//                 {
//                     return caches.open(CACHE_STATIC_NAME)
//                     .then(cache =>
//                     {
//                         return cache.match('/offline.html');
//                     })
//                 })
//             }
//         })
//     );
// });

// Cache only strategy
// self.addEventListener('fetch', event =>
// {
//     event.respondWith(
//         caches.match(event.request)
//     )
// })

// Network only strategy
// self.addEventListener('fetch', event =>
// {
//     event.respondWith(
//         fetch(event.request)
//     )
// })

// Network with fallout strategy
// self.addEventListener('fetch', event =>
// {
//     event.respondWith(
        
//         fetch(event.request)
//         .catch(error =>
//         {   
//             return caches.match(event.request);
//         })
//     )
// })

// Network first strategy
// self.addEventListener('fetch', event =>
// {
//     console.log("addEventListener");
    
//     event.respondWith(
        
//         fetch(event.request)
//         .then(async res =>
//         {
//             const cache = await caches.open(CACHE_DYNAMIC_NAME);

//             // put() is same as add() or addAll() but here we have to mention both key and value. First argument is key and 
//             // second one is value. You can use 'res' once only that's why we made a clone of res in place and while returning 
//             // we used an original 'res' variable without cloning as we have never used it before.
//             cache.put(event.request.url, res.clone());

//             console.log("Response : ",res);

//             return res;
//         })
//         .catch(error =>
//         {   
//             return caches.match(event.request);
//         })
//     )
// })