const fs = require( "fs" );
const express = require( "express" );
const fileUpload = require( "express-fileupload" );
const PDFToolsSdk = require( "@adobe/documentservices-pdftools-node-sdk" );

// Create Credentials
const credentials =  PDFToolsSdk.Credentials
    .serviceAccountCredentialsBuilder()
    .fromFile( "pdftools-api-credentials.json" )
    .build();

function fileToPDF( filename, outputFilename, callback ) {
    // Create an ExecutionContext using credentials and create a new operation instance.
    const executionContext = PDFToolsSdk.ExecutionContext.create( credentials ),
        createPdfOperation = PDFToolsSdk.CreatePDF.Operation.createNew();

    // Set operation input from a source file.
    const input = PDFToolsSdk.FileRef.createFromLocalFile( filename );
    createPdfOperation.setInput( input );

    // Execute the operation and Save the result to the specified location.
    createPdfOperation.execute( executionContext )
        .then( result => {
            result.saveAsFile( outputFilename );
            callback( outputFilename );
        } );
}

function combineFilesToPDF( files, outputFilename, callback ) {
    // Create an ExecutionContext using credentials and create a new operation instance.
    const executionContext = PDFToolsSdk.ExecutionContext.create( credentials ),
        combineFilesOperation = PDFToolsSdk.CombineFiles.Operation.createNew();

    // Set operation inputs from source files.
    files.forEach( file => {
        const input = PDFToolsSdk.FileRef.createFromLocalFile( file );
        combineFilesOperation.addInput( input );
    } );

    // Execute the operation and Save the result to the specified location.
    combineFilesOperation.execute( executionContext )
        .then( result => {
            result.saveAsFile( outputFilename );
            callback( outputFilename );
        } );
}

const app = express();

app.use( fileUpload() );

app.use( express.static( "public" ) );

app.get( "/files", ( req, res ) => {
    fs.readdir( __dirname + "/public/drafts/", ( err, files ) => {
        if( err ) {
            return res.status( 500 ).send( err );
        }
        return res.json( files.filter( f => f.endsWith( ".pdf" ) ) );
    } );
} );

app.get( "/finalize", ( req, res ) => {
    fs.readdir( __dirname + "/public/drafts/", ( err, files ) => {
        if( err ) {
            return res.status( 500 ).send( err );
        }
        combineFilesToPDF(
            files.filter( f => f.endsWith( ".pdf" ) ).map( f => __dirname + "/public/drafts/" + f ),
            __dirname + "/public/Final.pdf", ( file ) => {
            res.download( file );
        } );
    } );
} );

// Create a PDF file from an uploaded file
app.post( "/upload", ( req, res ) => {
    if( !req.files || Object.keys( req.files ).length === 0 ) {
        return res.status( 400 ).send( "No files were uploaded." );
    }
    
    // Create PDF from the uploaded file
    let file = req.files.myFile;
    file.mv( __dirname + "/public/drafts/" + file.name, ( err ) => {
        if( err ) {
            return res.status( 500 ).send( err );
        }
        if( file.name.endsWith( ".pdf" ) ) {
            res.redirect( "/" );
        }
        else {
            // Convert to PDF
            fileToPDF( __dirname + "/public/drafts/" + file.name, __dirname + "/public/drafts/" + file.name.replace( /\./g, "-" ) + ".pdf", ( file ) => {
                res.redirect( "/" );
            } );
        }
    });
} );

// Overwrite the PDF file with latest PDF changes and annotations
app.post( "/save", ( req, res ) => {
    if( !req.files || Object.keys( req.files ).length === 0 ) {
        return res.status( 400 ).send( "No files were uploaded." );
    }

    let file = req.files.pdf;
    file.mv( __dirname + "/public/drafts/" + file.name, ( err ) => {
        if( err ) {
            return res.status( 500 ).send( err );
        }
        res.send( "File uploaded" );
    });
} );

app.listen( 8888, function() {
    console.log( "Server started on port", 8888 );
} );
