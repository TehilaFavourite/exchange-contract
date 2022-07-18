pragma solidity 0.8.4;

import "./Token.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";


contract Exchange {
        using SafeMath for uint;

        address public feeAccount;
        uint256 public feePercent;
        uint256 public orderCount;
        address constant ETHER = address(0);

    struct _Order {
        uint256 id; 
        address user; //person who made the order
        address tokenGet; //token they want to purchase
        uint256 amountGet; //amount of token user wants to get
        address tokenGive; //token they will use in the trade i.e token they will give
        uint256 amountGive; // the amount they will give
        uint256 timestamp; // the actual time the order was created
            }    

    mapping(address => mapping(address => uint256)) public trackDeposit;
    mapping(uint256 => _Order) public orders;
    mapping(uint256 => bool) public orderCancelled;
    mapping(uint256 => bool) public orderFilled;
    

    event Deposit(address indexed token, address indexed msgSender, uint256 amount, uint256 balance);
    event Withdraw(address indexed token, address indexed user, uint256 amount, uint256 balance);
    event Order(
        uint256 id,
        address user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        uint256 timestamp
    );

    event Cancel(
        uint256 id,
        address user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        uint256 timestamp
    );

    event Trade(
        uint256 id,
        address user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        address userFill,
        uint256 timestamp
  );

    constructor (address _feeAccount, uint256 _feePercent) {
        feeAccount = _feeAccount;
        feePercent = _feePercent;
    }

    fallback() external {
        revert();
    }

    function depositEther() payable external {
        trackDeposit[ETHER][msg.sender] = trackDeposit[ETHER][msg.sender].add(msg.value);
        emit Deposit(ETHER, msg.sender, msg.value, trackDeposit[ETHER][msg.sender]);
    }

    function withdrawEther(uint _amount) payable external {
        require(trackDeposit[ETHER][msg.sender] >= _amount, "insufficent balance");
        trackDeposit[ETHER][msg.sender] = trackDeposit[ETHER][msg.sender].sub(_amount);
        payable (msg.sender).transfer(_amount);
        emit Withdraw(ETHER, msg.sender, _amount, trackDeposit[ETHER][msg.sender]);
    }

    function depositToken(address _token, uint256 _amount) external {
        Token(_token).transferFrom(msg.sender, address(this), _amount);
        trackDeposit[_token][msg.sender] = trackDeposit[_token][msg.sender].add(_amount); 
        emit Deposit(_token, msg.sender, _amount, trackDeposit[_token][msg.sender]);
    }

    function withdrawToken(address _token, uint256 _amount) external {
        require(_token != ETHER, "you cannot withdraw ether");
        require(trackDeposit[_token][msg.sender] >= _amount, "insufficient balance");
        trackDeposit[_token][msg.sender] = trackDeposit[_token][msg.sender].sub(_amount);
        require(Token(_token).transfer(msg.sender, _amount), "denied");
        emit Withdraw(_token, msg.sender, _amount, trackDeposit[_token][msg.sender]);
    }

    function balanceOf(address _token, address _user) external view returns (uint256) {
        return trackDeposit[_token][_user];
    }

    function makeOrder(address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) external {
        orderCount = orderCount.add(1);
        orders[orderCount] = _Order(orderCount, msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, block.timestamp);
        emit Order(orderCount, msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, block.timestamp);
    }

    function cancelOrder(uint256 _id) external {
        _Order storage _order = orders[_id];
        require(_order.user == msg.sender, "not your order");
        require(_order.id == _id, "order does not exist"); // The order must exist
        orderCancelled[_id] = true;
        emit Cancel(_order.id, msg.sender, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive, block.timestamp);
    }

    function fillOrder(uint256 _id) external {
        require(_id > 0 && _id <= orderCount, "id is invalid");
        require(!orderFilled[_id], "order is filled");
        require(!orderCancelled[_id], "order is cancelled");
        _Order storage _order = orders[_id];
        _trade(_order.id, _order.user, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive);
        orderFilled[_order.id] = true;
    }

  function _trade(uint256 _orderId, address _user, address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) internal {
        uint256 _feeAmount = _amountGet.mul(feePercent).div(100);

        trackDeposit[_tokenGet][msg.sender] = trackDeposit[_tokenGet][msg.sender].sub(_amountGet.add(_feeAmount));
        trackDeposit[_tokenGet][_user] = trackDeposit[_tokenGet][_user].add(_amountGet);
        trackDeposit[_tokenGet][feeAccount] = trackDeposit[_tokenGet][feeAccount].add(_feeAmount);
        trackDeposit[_tokenGive][_user] = trackDeposit[_tokenGive][_user].sub(_amountGive);
        trackDeposit[_tokenGive][msg.sender] = trackDeposit[_tokenGive][msg.sender].add(_amountGive);

        emit Trade(_orderId, _user, _tokenGet, _amountGet, _tokenGive, _amountGive, msg.sender, block.timestamp);
    }
}