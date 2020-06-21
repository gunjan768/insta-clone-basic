// Normally indexedDB database is comprised of callback functions but to convert it into promise based we used a file called 'idb.js'.
// This will open our promised based indexedDB database. IDB accepts three parameters : db name, idb version ( optional ), callback function.
// Inside callback we used createObjectStore which will create the store and accepts two arguments: table name ( or object name ) , key for
// that object so that whenever we want to reterieve something we can use this id to do so. 
var dbPromise = idb.open('posts-store', 1, db =>
{
    if(!db.objectStoreNames.contains('posts'))
    {
        db.createObjectStore('posts', 
        {
            keyPath: 'id'
        })
    }

    if(!db.objectStoreNames.contains('sync-posts'))
    {
        db.createObjectStore('sync-posts', 
        {
            keyPath: 'id'
        })
    }
})

const writeData = (st, data) =>
{
    return dbPromise
    .then(db =>
    {
        // Here we have created a transaction so that we can write some data to the database. We don't need to open the
        // db again as we did it before so we can directly access the opened db.To create a transaction we used transaction
        // method which accepts two arguments : which store we want to target with the transaction , which type of 
        // operation we want to perform ( like read-write, read-only etc ). 
        let tx = db.transaction(st, 'readwrite');

        // We opened the store and again we explicitly pass the store name ( little bit strange as we had done in tx ).
        let store = tx.objectStore(st);

        console.log("IDB : ",data);

        store.put(data);

        // 'complete' is a property which ensures that everything was successfull. 'complete' property is used whenever we are
        // interfering with the indexedDB.
        return tx.complete;
    })
}

const readAllData = st =>
{
    return dbPromise
    .then(db =>
    {
        let tx = db.transaction(st, 'readonly');
        let store = tx.objectStore(st);

        // remember here we didn't use 'tx.complete' as we had a read only purpose i.e we didn't interfere with the db
        return store.getAll();  
    })
}

const clearAllData = st => 
{
    return dbPromise
    .then(db => 
    {
        var tx = db.transaction(st, 'readwrite');
        var store = tx.objectStore(st);

        store.clear();
        
        return tx.complete;
    })
}

const deleteItemFromData = (st, id) =>
{
    // Here we are not returning the promise as we have handled here only ( return tx.complete returns a promise and we used it here only
    // by using then() ). You can return the promise as we did for all ( see all above functions ) and handle the promise in the place 
    // from where we called the function deleteItemFromData() . 
    dbPromise
    .then(db => 
    {
        var tx = db.transaction(st, 'readwrite');
        var store = tx.objectStore(st);

        store.delete(id);
        
        return tx.complete;
    })
    .then(() =>
    {
        console.log('Item deleted!');
    })
}

// IT will convert the URL base 64 to an array of unit 8 values.
const urlBase64ToUint8Array = base64String => 
{
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    
    var base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);

    for (var i = 0; i < rawData.length; ++i) 
    outputArray[i] = rawData.charCodeAt(i);
    
    return outputArray;
}

// This function will convert base 64 URL to a blob (file).
const dataURItoBlob = dataURI => 
{
    let byteString = atob(dataURI.split(',')[1]);
    let mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
    
    let ab = new ArrayBuffer(byteString.length);
    let ia = new Uint8Array(ab);
    
    for (let i=0; i<byteString.length; i++) 
    ia[i] = byteString.charCodeAt(i);
 
    let blob = new Blob([ab], {type: mimeString});
    
    return blob;
}