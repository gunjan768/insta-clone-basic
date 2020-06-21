const functions         =       require('firebase-functions');
const webpush           =       require('web-push');

// admin will access to the database.
const admin             =       require('firebase-admin');

// cores is used to send the right headers so that we can access this HTTP endpoint from an application running on a different server.
// Putting origin equals to true means we are allowing cross origin.
const cors              =       require('cors')({origin: true});

const serviceAccount    =       require("./secretDetails.json");

// formidable is a package which will reterieve all datas from inside the request reaching our server that are stored in FormData() type.
const formidable        =       require("formidable");

const fs                =       require("fs");
var os                  =       require("os");
var Busboy              =       require("busboy");
var path                =       require('path');

// This is the package which will help to generate the public URl for downloading the images. It will generate the unique id which we will
// pass as a metadata.
const UUID              =       require("uuid-v4");

// google-cloud storage is reuired to access the storage of the firebase
const { Storage }       =   require('@google-cloud/storage');

const storage = new Storage(
{
    projectId: "firstfirebase-3e4d9",
    keyFilename: "secretDetails.json"
});

admin.initializeApp(
{
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://firstfirebase-3e4d9.firebaseio.com/'
})

exports.storePostsData = functions.https.onRequest((req, res) => 
{
    // Wrap everything inside the cors and it will automatically send the right headers to allow cross origin.
    cors(req, res, () =>
    {
        // const formData = new formidable.IncomingForm();
        
        const busboy = new Busboy({ headers: req.headers });
    
        // These objects will store the values (file + fields) extracted from busboy
        let upload;
        const fields = {};

        // This callback will be invoked for each file uploaded
        busboy.on("file", (fieldname, file, filename, encoding, mimetype) => 
        {
        
            console.log(
                `File [${fieldname}] filename: ${filename}, encoding: ${encoding}, mimetype: ${mimetype}`
            );
            
            const filepath = path.join(os.tmpdir(), filename);
            upload = { file: filepath, type: mimetype };
            
            file.pipe(fs.createWriteStream(filepath));
        })

        // This will invoked on every field detected
        busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) 
        {
            fields[fieldname] = val;
        });

        busboy.on("finish", () => 
        {
            // fs.rename(files.file.path, '/tmp/' + files.file.name);
            
            // bucket means the storage where you kep your files ( images, etc ) i.e storage of the firebase.
            let bucket = storage.bucket("firstfirebase-3e4d9.appspot.com");

            // This is the unique ID we pass to the metadata so that firebase can automatically generate a download URL for us. 
            let uuid = UUID();
          
            bucket.upload(
                upload.file,
                {
                    // image is considered as a media
                    uploadType: "media",
                    metadata: 
                    {
                        metadata: 
                        {
                            contentType: upload.type,
                            
                            // This is the public download URL so that we user can access easily even if we are not the Google Cloud User. 
                            // Firebase does this default if we use Firebase sdk but we can't use on the server unfortunately. So we need to
                            // this by ourself and to generate the publuc URL we need an algorithm.
      
                            firebaseStorageDownloadTokens: uuid
                        }
                    }
                },
                (err, uploadedFile) =>
                {
                    if(!err) 
                    {   console.log("hhhh");
                        // Comming from fetch() api used in self.addEventListener('sync') of sw.js page.
                        admin.database().ref('posts').push(
                        {
                            title: fields.title,
                            location: fields.location,
                            rawLocation: 
                            {
                                lat: fields.rawLocationLat,
                                lng: fields.rawLocationLng
                            },
                            
                            // This is the pattern of the url that firebase uses. This cryptic looking URL is what firebase will generate as publicly
                            // accessible URL automatically since we passed uuid as a metadata. 
                            image:
                                "https://firebasestorage.googleapis.com/v0/b/" +
                                bucket.name +
                                "/o/" +
                                encodeURIComponent(uploadedFile.name) +
                                "?alt=media&token=" +
                                uuid    
                        })
                        .then(() =>
                        {
                            webpush.setVapidDetails(
                                'mailto:gunjan768@gmail.com',
                                'BFQKaSkkkAkPyFrGpFxflHgW96RoPbhoNytaBCDAsFEdSXwSGHbJ5V6-_yHsx_kF758FDhZssuJ9AJRkEK9tLEI',
                                'BH0BgAiFiZyuPfASRXSxGBUBh1MwPkd4q3RSll-Pm3A'
                            );
                            
                            return admin.database().ref('subscriptions').once('value');
                        })
                        .then(subscriptions =>
                        {
                            subscriptions.forEach(sub =>
                            {
                                // This is the setup for the push congif. You can directly assign pushConfig=sub.val() as in our firebase we store in the
                                // same manner as required by the webpush but to show the whole config of pushConfig we did this way.
                                var pushConfig = 
                                {
                                    endpoint: sub.val().endpoint,
                                    keys: 
                                    {
                                        auth: sub.val().keys.auth,
                                        p256dh: sub.val().keys.p256dh
                                    }
                                };

                                console.log("Hey");

                                // sendNotification() accepts payload as a second argument. Remember we can pass a limited data as a payload ( it may be 
                                // around 400 to 500 kbs ). After pushing , 'push' event will trigger in sw.js file.
                                webpush.sendNotification(pushConfig, JSON.stringify(
                                {
                                    title: 'New Post',
                                    content: 'New Post added!',
                                    openUrl: '/help'
                                }))
                                .then(result =>
                                {
                                    console.log("Result of web-push : ",result);
                                })
                                .catch(err => 
                                {
                                    console.log(err);
                                })
                            });

                            // It will return it from where it is called i.e return to the then() block of fetch() api used in self.addEventListener('sync')
                            // in sw.js page .
                            return res.status(201).json(
                            {
                                message: 'Data stored', 
                                id: fields.id
                            })
                        })
                        .catch(err => 
                        {
                            return res.status(500).json(
                            {
                                error: err
                            })
                        })
                    }
                }
            );
        })

        busboy.end(req.rawBody);
    })
})