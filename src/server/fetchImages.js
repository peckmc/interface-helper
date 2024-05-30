const { google } = require('googleapis')
const { AxiosCustomInstance } = require('./AxiosCustomInstance.js');
const path = require('path');
const fs = require('fs');

const fetchImages = async (urls, oAuth2Client) => {
  console.log('-------BEGIN FETCHING IMAGES-------')
  const drive = google.drive({
    version: "v3",
    auth: oAuth2Client,
  });

  const sheets = google.sheets({
    version: 'v4',
    auth: oAuth2Client,
  });

  const axios = AxiosCustomInstance();
  const dir = path.join(__dirname, '../../files');
  let sheetId = '';
  let docData = [];

  //TODO: create or append google sheet with ocr results from previously created docs
  //get id of spreadsheet to append or create
  var fileName = 'Historic Images OCR Results'
  var mimeType = 'application/vnd.google-apps.spreadsheet'

  await drive.files.list({
    q: `mimeType='${mimeType}' and name='${fileName}'`,
    fields: 'files(id, name)'
  })
  .then((res) => {
    const files = res.data.files
    if (files.length) {
      // There is an existing spreadsheet(s) with the same filename
      // The spreadsheet Id will be in files[x].id
      console.log(`found spreadsheet with id: ${files[0].id}`)
      sheetId = files[0].id;
    } else {
      // Create spreadsheet with filename ${fileName}
      sheets.spreadsheets.create({
        resource: {
          properties: { title: fileName }},
        fields: 'spreadsheetId'
      })
      .then((res) => {
        // The spreadsheet Id will be in ${spreadsheet.data.spreadsheetId}
        console.log(`created spreadsheet with id: ${spreadsheet.data.spreadsheetId}`)
        sheetId = spreadsheet.data.spreadsheetId;
      })
      .catch((err) => {
        console.log('error creating google spreadsheet.')
      })
    }
  })
  .catch((err) => {
    console.log('error finding google spreadsheet.')
  })

  //takes a list of urls and saves them locally
  for (const url of urls) {
    let filename = `/${url.slice(-13)}`;

    await axios.request({
      method: 'get',
      url: url,
      responseType: 'stream',
    })
    .then(function (response) {
      console.log('urlname:', url)
      let stream = response.data.pipe(fs.createWriteStream(dir + filename));
      stream.on('finish', async () => {
        return;
      });
    })
    .catch((err) => {
      console.log(`error fetching ${url}: ${err}`)
    })
  }
  //after the files are saved, they are uploaded to google drive
  fs.readdir(dir, async (err, files) => {
    if (err) {
      console.log('error uploading files to google drive:', err);
    }
    for (const filename of files) {
      let requestBody = {
        name: filename,
        fields: 'id',
        parents: ['1a3jS1AW72ZmYz990cjtQoPp9SMl0OW2x'],
      };
      let media = {
        mimeType: 'image/jpeg',
        body: fs.createReadStream(path.join(dir, filename))
      };
      //the jpg is uploaded
      let gfile = await drive.files.create({
        requestBody,
        media: media,
      })
      let id = gfile.data.id;
      console.log('file id: ', gfile.data.id);
      const params = {
        fileId: id,
        resource:
        {
          mimeType: 'application/vnd.google-apps.document',
          parents: ['1a3jS1AW72ZmYz990cjtQoPp9SMl0OW2x'],
        },
        fields: 'id',
      };
      //and then the jpg is converted to a google doc
      await drive.files.copy(params)
      .then((res) => {
        console.log('converted file id: ', res.data.id);

        //the local file is deleted
        fs.unlink(path.join(dir, filename), (err) => {
          if (err) {
            console.log(`error deleting file ${filename}`)
          }
          console.log(`${filename} has been deleted.`);
        });
        return res.data.id;
      })
      .then((id) => {
        console.log('id:', id)
        return drive.files.export({ fileId: id, mimeType: 'text/plain'})
      })
      .then((res) => {
        let values = [
          [
            filename.slice(0, -4), res.data
          ]
        ];
        let resource = {
          values,
        };
        return sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: 'Sheet1',
          valueInputOption: 'RAW',
          resource: resource,
        })
      })
      .catch((err) =>{
        console.log(`drive error copying file ${filename}: ${err}`)
      })
    };
  });
};

module.exports = { fetchImages };