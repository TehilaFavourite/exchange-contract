pragma solidity 0.8.4;

import "./Token.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";


contract Exchange {
        using SafeMath for uint;

        address public feeAccount;
        uint256 public feePercent;
        address constant ETHER = address(0);

    mapping(address => mapping(address => uint256)) public trackDeposit;

    event Deposit(address indexed token, address indexed msgSender, uint256 amount, uint256 balance);
    event Withdraw(address indexed token, address indexed user, uint256 amount, uint256 balance);

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
        require(Token(_token).transfer(msg.sender, _amount), "the reason");
        emit Withdraw(_token, msg.sender, _amount, trackDeposit[_token][msg.sender]);
    }
}