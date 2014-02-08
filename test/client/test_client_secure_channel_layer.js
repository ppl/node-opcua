var ClientSecureChannelLayer = require("../../lib/client/client_secure_channel_layer").ClientSecureChannelLayer;
var should  = require("should");

var debugLog  = require("../../lib/utils").make_debugLog(__filename);

var MockTransport           = require("../mocks/mock_transport").MockTransport;
var fake_AcknowledgeMessage = require("../mocks/mock_transport").fake_AcknowledgeMessage;
var fake_OpenSecureChannelResponse = require("../mocks/mock_transport").fake_OpenSecureChannelResponse;
var fake_CloseSecureChannelResponse = require("../mocks/mock_transport").fake_CloseSecureChannelResponse;
var assert = require("assert");

function decompose_message_in_chunks(message,msgType,chunk_size) {
    var decompose_message_body_in_chunks = require("./../../lib/secure_channel_service").decompose_message_body_in_chunks;
    assert(msgType.length ==3 );
    chunk_size = chunk_size || 32;
    var BinaryStream  = require("./../../lib/binaryStream").BinaryStream;
    var buffer = new Buffer(message.binaryStoreSize());
    message.encode(new BinaryStream(buffer));
    return decompose_message_body_in_chunks(buffer,msgType,chunk_size);
}


describe("testing ClientSecureChannelLayer ",function(){

    it("should create a ClientSecureChannelLayer",function(done){

        var mock = new MockTransport([

            //
            opcua.packTcpMessage("ACK", fake_AcknowledgeMessage),

            require("../fixture_full_tcp_packets").packet_sc_2 // OpenChannelResponse

        ],done);

        require("../../lib/transport/tcp_transport").setFakeTransport(mock.fake_socket.client);

        var secureChannel = new ClientSecureChannelLayer();

        secureChannel.create("fake://localhost:2033/SomeAddress",function(err){
            done(err);
        });
    });

    it("should close a ClientSecureChannelLayer",function(done){

        var mock = new MockTransport([

            // ---------------------------------------------------- Transaction 1
            // Client will send a HEl_message
            // Server will reply with this :
            opcua.packTcpMessage("ACK", fake_AcknowledgeMessage),

            // ---------------------------------------------------- Transaction 2
            // client will send a "OPN" OpenSecureChannelRequest
            // Server will reply with this:
            require("../fixture_full_tcp_packets").packet_sc_2, // OpenChannelResponse

            // ---------------------------------------------------- Transaction 3
            // client will send a "CLO" CloseSecureChannelRequest
            // Server will close the socket, without sending a response
            function() { this.fake_socket.server.end(); },

            function() { done(new Error("no more packet to mock")); }

        ],done);

        require("../../lib/transport/tcp_transport").setFakeTransport(mock.fake_socket.client);

        var secureChannel = new ClientSecureChannelLayer();

        secureChannel.create("fake://localhost:2033/SomeAddress",function(err){
            secureChannel.close(function(err){
                done(err);
            });
        });
    });


    it("should use token provided by server in messages",function(done){

        var mock = new MockTransport([
            // ---------------------------------------------------- Transaction 1
            // Client will send a HEl_message
            // Server will reply with this :
            opcua.packTcpMessage("ACK", fake_AcknowledgeMessage),

            // ---------------------------------------------------- Transaction 2
            // client will send a "OPN" OpenSecureChannelRequest
            // Server will reply with this:
            require("../fixture_full_tcp_packets").packet_sc_2,

            // ---------------------------------------------------- Transaction 3
            // client will send a "CLO" CloseSecureChannelRequest
            // Server will close the socket, without sending a response
            function() { this.fake_socket.server.end(); }

        ],done);

        require("../../lib/transport/tcp_transport").setFakeTransport(mock.fake_socket.client);

        var secureChannel = new ClientSecureChannelLayer();

        (!!secureChannel.tokenId).should.equal(false);

        secureChannel.create("fake://localhost:2033/SomeAddress",function(err){

            secureChannel.tokenId.should.equal(1);
            secureChannel.close(function(err){
                done(err);
            });
        });
    });

});