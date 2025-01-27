// Copyright 2021 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
const express = require('express');
const bodyParser = require('body-parser');
const {Storage} = require('@google-cloud/storage');
const storage = new Storage();
const Firestore = require('@google-cloud/firestore');
const { HTTP } = require("cloudevents");
const {toStorageObjectData} = require('@google/events/cloud/storage/v1/StorageObjectData');

const app = express();
app.use(bodyParser.json());

const bucketThumbnails = process.env.BUCKET_THUMBNAILS;

app.post('/', async (req, res) => {
    try {
        const cloudEvent = HTTP.toEvent({ headers: req.headers, body: req.body });
        console.log(cloudEvent);

        const storageObjectData = toStorageObjectData(cloudEvent.data);
        console.log(storageObjectData);

        const objectName = storageObjectData.name;

        // Delete from thumbnails
        try {
            await storage.bucket(bucketThumbnails).file(objectName).delete();
            console.log(`Deleted '${objectName}' from bucket '${bucketThumbnails}'.`);
        }
        catch(err) {
            console.log(`Failed to delete '${objectName}' from bucket '${bucketThumbnails}': ${err}.`);
        }

        // Delete from Firestore
        try {
            const pictureStore = new Firestore().collection('pictures');
            const docRef = pictureStore.doc(objectName);
            await docRef.delete();

            console.log(`Deleted '${objectName}' from Firestore collection 'pictures'`);
        }
        catch(err) {
            console.log(`Failed to delete '${objectName}' from Firestore: ${err}.`);
        }

        res.status(200).send(`Processed '${objectName}'.`);
    } catch (err) {
        console.log(`Error: ${err}`);
        res.status(500).send(err);
    }
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    if (!bucketThumbnails) throw new Error("BUCKET_THUMBNAILS not set");
    console.log(`Started service on port ${PORT}`);
});
